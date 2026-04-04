/**
 * Retrieval Service
 *
 * Handles the "R" in RAG — given a user query and a resume, returns
 * the most relevant chunks. Manages the full pipeline:
 *
 * 1. Check if resume chunks are already embedded & cached
 * 2. If not, chunk the resume and generate embeddings
 * 3. Generate the query embedding
 * 4. Perform cosine similarity search
 * 5. Return top-K relevant chunks
 *
 * @module lib/services/rag/retrievalService
 */

import { logger } from "@/lib/logger";
import { generateEmbedding } from "@/lib/services/aiGenerationService";
import type { ResumeProfile } from "@/types";
import { chunkResume, chunkRawText } from "./chunkingService";
import type { EmbeddedChunk, ResumeChunk, RetrievalResult } from "./types";
import { setChunks, hasValidChunks, searchSimilar } from "./vectorStore";

/**
 * Index a resume: chunk it and generate embeddings for all chunks.
 * Results are stored in the in-memory vector store.
 *
 * @param profile - Resume profile to index (structured JSON)
 * @param resumeId - Unique resume identifier
 * @returns The embedded chunks that were stored
 */
export async function indexResume(
  profile: ResumeProfile,
  resumeId: string,
): Promise<EmbeddedChunk[]> {
  const chunks = chunkResume(profile, resumeId);

  if (!chunks.length) {
    logger.warn({ resumeId }, "No chunks generated from resume");
    return [];
  }

  logger.info(
    { resumeId, chunkCount: chunks.length },
    "Generating embeddings for resume chunks",
  );

  const embeddedChunks = await embedChunks(chunks);

  setChunks(resumeId, embeddedChunks);

  logger.info(
    { resumeId, embeddedCount: embeddedChunks.length },
    "Resume indexed in vector store",
  );

  return embeddedChunks;
}

/**
 * Index raw text (non-structured) into the vector store.
 */
export async function indexRawText(
  text: string,
  resumeId: string,
): Promise<EmbeddedChunk[]> {
  const chunks = chunkRawText(text, resumeId);
  if (!chunks.length) return [];

  const embeddedChunks = await embedChunks(chunks);
  setChunks(resumeId, embeddedChunks);
  return embeddedChunks;
}

/**
 * Retrieve the most relevant chunks for a query against a specific resume.
 *
 * If the resume is not yet indexed, it will be indexed first (lazy indexing).
 *
 * @param query - The user's question or search text
 * @param resumeId - Resume to search within
 * @param profile - Resume profile (needed if not yet indexed)
 * @param topK - Number of chunks to return (default: 5)
 * @param threshold - Minimum similarity score (default: 0.3)
 * @returns Array of relevant chunks sorted by similarity
 */
export async function retrieveRelevantChunks(
  query: string,
  resumeId: string,
  profile?: ResumeProfile,
  topK: number = 5,
  threshold: number = 0.3,
): Promise<RetrievalResult[]> {
  // Ensure resume is indexed
  if (!hasValidChunks(resumeId)) {
    if (!profile) {
      logger.error({ resumeId }, "Resume not indexed and no profile provided");
      return [];
    }
    await indexResume(profile, resumeId);
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Search for similar chunks
  const results = searchSimilar(resumeId, queryEmbedding, topK, threshold);

  logger.info(
    {
      resumeId,
      query: query.substring(0, 100),
      resultsFound: results.length,
      topScore: results[0]?.score ?? 0,
    },
    "Retrieval completed",
  );

  return results;
}

/**
 * Build context string from retrieval results for LLM prompt.
 * Formats chunks into a clean text block the LLM can reason over.
 */
export function buildContextFromChunks(results: RetrievalResult[]): string {
  if (!results.length) return "No relevant information found.";

  return results
    .map((r, i) => {
      const sectionLabel = r.chunk.section.toUpperCase();
      const meta = Object.entries(r.chunk.metadata)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const header = meta ? `[${sectionLabel} — ${meta}]` : `[${sectionLabel}]`;
      return `--- Chunk ${i + 1} (relevance: ${(r.score * 100).toFixed(1)}%) ${header} ---\n${r.chunk.text}`;
    })
    .join("\n\n");
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Generate embeddings for an array of chunks with bounded concurrency.
 *
 * Uses a concurrency limit of 3 to balance speed vs Gemini rate limits:
 * - Too low (1) → slow first query (sequential API calls)
 * - Too high (all at once) → 429 rate-limit errors from embedding API
 *
 * Chunks that fail embedding are skipped with a warning so a partial
 * failure never blocks the whole indexing operation.
 */
async function embedChunks(
  chunks: ResumeChunk[],
  concurrency = 3,
): Promise<EmbeddedChunk[]> {
  const embedded: EmbeddedChunk[] = new Array(chunks.length);
  const queue = [...chunks.entries()]; // [index, chunk] pairs

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      const [i, chunk] = next;
      try {
        const embedding = await generateEmbedding(chunk.text);
        embedded[i] = { ...chunk, embedding };
      } catch (err) {
        logger.error(
          { err, chunkId: chunk.id, section: chunk.section },
          "Failed to generate embedding for chunk — skipping",
        );
      }
    }
  }

  // Run `concurrency` workers in parallel
  await Promise.all(Array.from({ length: concurrency }, worker));

  // Filter out any slots where embedding failed (undefined entries)
  return embedded.filter(Boolean);
}
