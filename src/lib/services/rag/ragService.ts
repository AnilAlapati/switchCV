/**
 * RAG Service — Main Orchestrator
 *
 * End-to-end RAG pipeline for resume-based Q&A:
 *
 *   User Query
 *     ↓
 *   Check response cache → if hit, return immediately
 *     ↓
 *   Embed query
 *     ↓
 *   Retrieve relevant chunks (cosine similarity)
 *     ↓
 *   LLM call (with filtered context, NOT full resume)
 *     ↓
 *   Evaluate output (factual alignment)
 *     ↓
 *   Retry if score < threshold (up to 2 retries)
 *     ↓
 *   Cache response
 *     ↓
 *   Return answer
 *
 * Key principle: LESS input to LLM → BETTER output.
 * Instead of sending a full resume (2000+ words), we send only
 * the 3–5 most relevant chunks (300–800 words total).
 *
 * @module lib/services/rag/ragService
 */

import { logger } from "@/lib/logger";
import { generateText } from "@/lib/services/aiGenerationService";
import type { ResumeProfile } from "@/types";
import type {
  RAGQueryOptions,
  RAGResult,
  EvalRetryOptions,
  RetrievalResult,
  ConversationTurn,
} from "./types";
import {
  retrieveRelevantChunks,
  buildContextFromChunks,
  indexResume,
} from "./retrievalService";
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
} from "./responseCache";

// ─── Default thresholds ─────────────────────────────────────────────

const DEFAULT_TOP_K = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.3;
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.3; // Low temp for factual answers
const DEFAULT_SCORE_THRESHOLD = 0.7;
const DEFAULT_MAX_RETRIES = 2;

// ─── Fix 2: Query Expansion ─────────────────────────────────────────
//
// Abstract single-concept queries ("distributed systems", "ML") score
// poorly against experience chunks because the resume uses specific
// technology names (Kafka, Go, FastAPI) rather than category labels.
//
// Strategy: heuristic synonym map — zero extra API calls, zero latency.
// We prepend related terms so the embedding captures both the abstract
// category AND the concrete technologies associated with it.

const QUERY_EXPANSIONS: Record<string, string> = {
  "distributed systems":
    "microservices scalability kafka rabbitmq grpc messaging queue event-driven architecture high throughput",
  "machine learning":
    "ml ai deep learning neural networks tensorflow pytorch model training inference data science NLP",
  frontend:
    "react vue angular typescript javascript css html ui components design system responsive",
  backend:
    "api rest grpc server database sql nosql caching microservices services golang python nodejs",
  devops:
    "docker kubernetes ci/cd terraform aws gcp azure infrastructure deployment pipeline helm",
  security:
    "authentication authorization oauth jwt encryption tls ssl vulnerability penetration testing",
  testing:
    "unit tests integration tests e2e tdd bdd coverage jest mocha pytest selenium",
  leadership:
    "tech lead manager mentoring hiring roadmap stakeholders team building sprint planning",
  performance:
    "optimization latency throughput p99 p95 caching profiling benchmark load testing scalability",
  cloud:
    "aws gcp azure s3 ec2 lambda cloud functions storage compute networking iam",
  database:
    "sql postgresql mysql mongodb redis elasticsearch firestore nosql orm migrations",
  "system design":
    "architecture scalability distributed systems microservices load balancer cache database sharding",
};

/**
 * Expand an abstract query with related technical terms before embedding.
 *
 * This significantly improves retrieval for short or category-level queries
 * (e.g. "distributed systems") by ensuring the embedding captures the
 * concrete vocabulary present in resume chunks (Kafka, microservices, etc.).
 *
 * Synchronous — no API call, no added latency.
 */
export function expandQueryForRetrieval(query: string): string {
  const lower = query.toLowerCase();
  const expansions: string[] = [];

  for (const [pattern, terms] of Object.entries(QUERY_EXPANSIONS)) {
    if (lower.includes(pattern)) {
      expansions.push(terms);
    }
  }

  return expansions.length > 0 ? `${query} ${expansions.join(" ")}` : query;
}

// ─── Main entry point ───────────────────────────────────────────────

/**
 * Execute a full RAG query against a resume.
 *
 * @param profile - The resume profile (structured JSON)
 * @param options - Query options
 * @param evalOptions - Optional evaluation + retry settings
 * @returns RAG result with answer, source chunks, and metadata
 */
export async function queryWithRAG(
  profile: ResumeProfile,
  options: RAGQueryOptions,
  evalOptions?: EvalRetryOptions,
): Promise<RAGResult> {
  const {
    query,
    resumeId,
    topK = DEFAULT_TOP_K,
    similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    userId,
    conversationHistory,
  } = options;

  const scoreThreshold = evalOptions?.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;
  const maxRetries = evalOptions?.maxRetries ?? DEFAULT_MAX_RETRIES;

  // ── Step 1: Retrieve relevant chunks ──────────────────────────────
  // Expand abstract queries before embedding so that category-level terms
  // ("distributed systems") map to the concrete vocabulary used in resume
  // chunks (Kafka, microservices, etc.).

  const retrievalQuery = expandQueryForRetrieval(query);
  const queryWasExpanded = retrievalQuery !== query;

  let retrievalResults = await retrieveRelevantChunks(
    retrievalQuery,
    resumeId,
    profile,
    topK,
    similarityThreshold,
  );

  // ── Observability: log what was retrieved and why ─────────────────
  logger.info(
    {
      resumeId,
      query: query.substring(0, 120),
      expanded: queryWasExpanded,
      chunksRetrieved: retrievalResults.length,
      topScore: retrievalResults[0]?.score ?? 0,
      chunks: retrievalResults.map((r) => ({
        section: r.chunk.section,
        score: parseFloat(r.score.toFixed(3)),
        preview: r.chunk.text.substring(0, 100),
        metadata: r.chunk.metadata,
      })),
    },
    "RAG retrieval",
  );

  // ── No-context guard (hallucination killer) ───────────────────────
  // If ALL chunks score below 0.4 the context is too weak to support a
  // grounded answer. Return early rather than risk hallucination.
  const TOP_SCORE_FLOOR = 0.4;
  if (
    retrievalResults.length === 0 ||
    retrievalResults[0].score < TOP_SCORE_FLOOR
  ) {
    logger.warn(
      { resumeId, topScore: retrievalResults[0]?.score ?? 0 },
      "RAG: top chunk score below floor — returning insufficient-context response",
    );
    return {
      answer:
        "Insufficient information in this resume to answer your question reliably.",
      sourceChunks: retrievalResults,
      cached: false,
      attempts: 0,
      qualityScore: undefined,
    };
  }

  // ── Fallback retrieval ────────────────────────────────────────────
  // When query expansion is active but the top result is still weak
  // (0.4–0.5), retry with the original unexpanded query. Expansion can
  // occasionally dilute the query signal; the plain query sometimes
  // gives a sharper embedding match.
  const EXPANSION_FALLBACK_THRESHOLD = 0.5;
  if (
    queryWasExpanded &&
    retrievalResults[0].score < EXPANSION_FALLBACK_THRESHOLD
  ) {
    const fallbackResults = await retrieveRelevantChunks(
      query,
      resumeId,
      profile,
      topK,
      similarityThreshold,
    );
    if (
      fallbackResults.length > 0 &&
      fallbackResults[0].score > retrievalResults[0].score
    ) {
      logger.info(
        {
          resumeId,
          expandedTopScore: retrievalResults[0].score.toFixed(3),
          fallbackTopScore: fallbackResults[0].score.toFixed(3),
        },
        "RAG: fallback retrieval (original query) outperformed expanded query",
      );
      retrievalResults = fallbackResults;
    }
  }

  // ── Step 2: Check response cache ──────────────────────────────────
  // Fix 1: Include conversation turn depth in cache key so follow-up
  // questions with different history never get a stale cache hit.

  const chunkIds = retrievalResults.map((r) => r.chunk.id);
  const turnSuffix = conversationHistory?.length
    ? `__turn${conversationHistory.length}`
    : "";
  const cacheKey = generateCacheKey(`${query}${turnSuffix}`, chunkIds);
  const cached = getCachedResponse(cacheKey);

  if (cached) {
    logger.info(
      { resumeId, cacheKey: cacheKey.substring(0, 12) },
      "RAG cache hit",
    );
    return {
      answer: cached.answer,
      sourceChunks: retrievalResults,
      cached: true,
      qualityScore: cached.qualityScore,
      attempts: 1,
      model: cached.model,
      provider: cached.provider,
    };
  }

  // ── Step 3: LLM call with evaluation + retry ──────────────────────

  const context = buildContextFromChunks(retrievalResults);
  let bestAnswer = "";
  let bestScore = 0;
  let attempts = 0;
  let lastModel: string | undefined;
  let lastProvider: string | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts++;
    const prompt = buildRAGPrompt(
      query,
      context,
      attempt > 0,
      conversationHistory,
    );

    try {
      const result = await generateText(
        prompt,
        maxTokens,
        temperature,
        undefined,
        userId,
      );

      lastModel = result.model;
      lastProvider = result.provider;

      const answer = result.text.trim();
      const score = evaluateRAGResponse(answer, retrievalResults, query);

      logger.info(
        {
          resumeId,
          attempt: attempt + 1,
          score: score.toFixed(2),
          model: result.model,
        },
        "RAG response evaluated",
      );

      if (score > bestScore) {
        bestScore = score;
        bestAnswer = answer;
      }

      // If quality is good enough, stop retrying
      if (score >= scoreThreshold) {
        break;
      }

      // Log retry reason
      if (attempt < maxRetries) {
        logger.info(
          { resumeId, score: score.toFixed(2), threshold: scoreThreshold },
          "Score below threshold — retrying with improved prompt",
        );
      }
    } catch (err) {
      logger.error(
        { err, resumeId, attempt: attempt + 1 },
        "RAG LLM call failed",
      );
      // Continue to retry if we have attempts left
    }
  }

  if (!bestAnswer) {
    return {
      answer:
        "I was unable to generate a reliable answer. Please try rephrasing your question.",
      sourceChunks: retrievalResults,
      cached: false,
      attempts,
      qualityScore: 0,
    };
  }

  // ── Step 4: Cache the best response ─────────────────────────────

  setCachedResponse(cacheKey, bestAnswer, {
    model: lastModel,
    provider: lastProvider,
    qualityScore: bestScore,
  });

  return {
    answer: bestAnswer,
    sourceChunks: retrievalResults,
    cached: false,
    qualityScore: bestScore,
    attempts,
    model: lastModel,
    provider: lastProvider,
  };
}

/**
 * Pre-index a resume so subsequent queries are faster.
 * Call this when a resume is published or updated.
 */
export async function preIndexResume(
  profile: ResumeProfile,
  resumeId: string,
): Promise<{ chunkCount: number }> {
  const chunks = await indexResume(profile, resumeId);
  return { chunkCount: chunks.length };
}

// ─── Prompt Construction ────────────────────────────────────────────

function buildRAGPrompt(
  query: string,
  context: string,
  isRetry: boolean,
  conversationHistory?: ConversationTurn[],
): string {
  const retryInstruction = isRetry
    ? "\n\nIMPORTANT: Your previous answer was not grounded enough in the provided context. " +
      "This time, be more factually accurate and ONLY use information explicitly stated in the context below. " +
      "Do NOT assume, infer, or add information not present in the context."
    : "";

  // Fix 1: Inject conversation history so follow-up questions are coherent.
  const historyBlock = conversationHistory?.length
    ? `\n--- CONVERSATION HISTORY ---\n` +
      conversationHistory
        .map((turn, i) => `Turn ${i + 1}:\nQ: ${turn.query}\nA: ${turn.answer}`)
        .join("\n\n") +
      `\n--- END HISTORY ---\n`
    : "";

  // Fix 3 + 4: Updated rules — always require evidence-backed reasoning;
  // never infer or generalise beyond what the context explicitly states.
  return `You are a resume analysis assistant. Answer the user's question using ONLY the resume context provided below.${historyBlock}

RULES:
1. Answer STRICTLY based on the provided context chunks — do not hallucinate or assume
2. Always justify your answer with specific examples: cite company names, dates, numbers, and technologies from the context. If no supporting evidence exists, say explicitly: "This resume contains no evidence of [X]. Based on the resume, the candidate's background is in [Y instead]."
3. Only list skills or facts that are explicitly stated in the context — do NOT infer or generalise (e.g. do not add "frontend" skills when only backend skills are listed)
4. Keep the answer concise and direct
5. If this is a follow-up question, build on the conversation history above rather than starting fresh${retryInstruction}

--- RESUME CONTEXT (relevant sections only) ---
${context}
--- END CONTEXT ---

USER QUESTION: ${query}

ANSWER:`;
}

// ─── Response Evaluation ────────────────────────────────────────────

/**
 * Evaluate how well the LLM response is grounded in the provided chunks.
 * Returns a score from 0 to 1.
 *
 * Scoring:
 * - Key terms from chunks appearing in answer → higher score
 * - Answer says "not available" when chunks are sparse → appropriate
 * - Very long answers with few source terms → likely hallucination
 */
function evaluateRAGResponse(
  answer: string,
  sourceChunks: RetrievalResult[],
  query: string,
): number {
  if (!answer?.trim()) return 0;

  const answerLower = answer.toLowerCase();

  // If the answer explicitly says info isn't available and chunks have low relevance
  const avgScore =
    sourceChunks.reduce((sum, c) => sum + c.score, 0) / sourceChunks.length;
  if (
    answerLower.includes("not available") ||
    answerLower.includes("not mentioned") ||
    answerLower.includes("not found in the resume")
  ) {
    // If chunks had low relevance, saying "not available" is correct
    return avgScore < 0.5 ? 0.9 : 0.5;
  }

  // Extract key terms from chunks (nouns, names, numbers)
  const chunkTerms = extractKeyTerms(
    sourceChunks.map((c) => c.chunk.text).join(" "),
  );

  if (chunkTerms.size === 0) return 0.5;

  // Count how many chunk terms appear in the answer
  let matchedTerms = 0;
  for (const term of chunkTerms) {
    if (answerLower.includes(term.toLowerCase())) {
      matchedTerms++;
    }
  }

  const termCoverage = matchedTerms / chunkTerms.size;

  // Extract query terms to check relevance
  const queryTerms = extractKeyTerms(query);
  let queryMatch = 0;
  for (const term of queryTerms) {
    if (answerLower.includes(term.toLowerCase())) {
      queryMatch++;
    }
  }
  const queryRelevance =
    queryTerms.size > 0 ? queryMatch / queryTerms.size : 0.5;

  // Penalize very long answers (likely hallucination)
  const answerWords = answer.split(/\s+/).length;
  const contextWords = sourceChunks.reduce(
    (sum, c) => sum + c.chunk.wordCount,
    0,
  );
  const lengthPenalty = answerWords > contextWords * 1.5 ? 0.8 : 1.0;

  // Final score: weighted combination
  const score =
    (termCoverage * 0.5 + queryRelevance * 0.3 + avgScore * 0.2) *
    lengthPenalty;

  return Math.min(1, Math.max(0, score));
}

/**
 * Extract key terms (proper nouns, numbers, multi-word phrases) from text.
 * Used for grounding evaluation.
 */
function extractKeyTerms(text: string): Set<string> {
  const terms = new Set<string>();

  // Numbers and percentages
  const numbers = text.match(/\d[\d,.]*%?/g);
  if (numbers) numbers.forEach((n) => terms.add(n));

  // Capitalized words (likely proper nouns: company names, technologies)
  const properNouns = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
  if (properNouns) {
    properNouns.filter((p) => p.length > 2).forEach((p) => terms.add(p));
  }

  // Technology terms (common patterns)
  const techTerms = text.match(
    /\b(?:JavaScript|TypeScript|Python|Java|React|Angular|Vue|Node\.js|AWS|GCP|Azure|Docker|Kubernetes|SQL|NoSQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|CI\/CD|Git|Agile|Scrum)\b/gi,
  );
  if (techTerms) techTerms.forEach((t) => terms.add(t));

  // Years
  const years = text.match(/\b20\d{2}\b/g);
  if (years) years.forEach((y) => terms.add(y));

  return terms;
}
