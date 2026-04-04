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
  } = options;

  const scoreThreshold = evalOptions?.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;
  const maxRetries = evalOptions?.maxRetries ?? DEFAULT_MAX_RETRIES;

  // ── Step 1: Retrieve relevant chunks ──────────────────────────────

  const retrievalResults = await retrieveRelevantChunks(
    query,
    resumeId,
    profile,
    topK,
    similarityThreshold,
  );

  if (!retrievalResults.length) {
    logger.warn(
      { resumeId, query: query.substring(0, 100) },
      "No relevant chunks found",
    );
    return {
      answer:
        "I couldn't find relevant information in this resume to answer your question.",
      sourceChunks: [],
      cached: false,
      attempts: 0,
      qualityScore: undefined,
    };
  }

  // ── Step 2: Check response cache ──────────────────────────────────

  const chunkIds = retrievalResults.map((r) => r.chunk.id);
  const cacheKey = generateCacheKey(query, chunkIds);
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
    const prompt = buildRAGPrompt(query, context, attempt > 0);

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
): string {
  const retryInstruction = isRetry
    ? "\n\nIMPORTANT: Your previous answer was not grounded enough in the provided context. " +
      "This time, be more factually accurate and ONLY use information explicitly stated in the context below. " +
      "Do NOT assume, infer, or add information not present in the context."
    : "";

  return `You are a resume analysis assistant. Answer the user's question using ONLY the resume context provided below. 

RULES:
1. Answer STRICTLY based on the provided context chunks — do not hallucinate or assume
2. If the context doesn't contain enough information, say "This information is not available in the resume"
3. Be specific — cite details from the context (company names, dates, skills, etc.)
4. Keep the answer concise and direct
5. Do not make up or infer information that is not explicitly stated${retryInstruction}

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
