/**
 * In-Memory Vector Store
 *
 * Stores resume chunks with their embeddings and supports fast cosine
 * similarity search. Designed as a lightweight alternative to Pinecone/Weaviate
 * for the MVP phase.
 *
 * Architecture:
 * - Per-resume stores keyed by resumeId
 * - Cosine similarity for retrieval
 * - Automatic eviction of stale entries (configurable TTL)
 *
 * Future: Replace with Firestore vector search (already exists in
 * semanticSearchService.ts) or a dedicated vector DB when scale demands it.
 *
 * @module lib/services/rag/vectorStore
 */

import type { EmbeddedChunk, ResumeChunk, RetrievalResult } from "./types";

/** TTL for cached vectors: 1 hour */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

/** Max entries per resume to bound memory */
const MAX_CHUNKS_PER_RESUME = 200;

interface StoreEntry {
  chunks: EmbeddedChunk[];
  createdAt: number;
  ttlMs: number;
}

/** In-memory store: resumeId → chunks with embeddings */
const store = new Map<string, StoreEntry>();

/**
 * Store embedded chunks for a resume.
 */
export function setChunks(
  resumeId: string,
  chunks: EmbeddedChunk[],
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  const bounded = chunks.slice(0, MAX_CHUNKS_PER_RESUME);
  store.set(resumeId, {
    chunks: bounded,
    createdAt: Date.now(),
    ttlMs,
  });
}

/**
 * Get stored chunks for a resume (returns null if expired or missing).
 */
export function getChunks(resumeId: string): EmbeddedChunk[] | null {
  const entry = store.get(resumeId);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > entry.ttlMs) {
    store.delete(resumeId);
    return null;
  }

  return entry.chunks;
}

/**
 * Check if a resume has cached vectors that are still valid.
 */
export function hasValidChunks(resumeId: string): boolean {
  return getChunks(resumeId) !== null;
}

/**
 * Remove cached chunks for a resume.
 */
export function clearChunks(resumeId: string): void {
  store.delete(resumeId);
}

/**
 * Clear entire store (useful for testing / memory pressure).
 */
export function clearAll(): void {
  store.clear();
}

/**
 * Get store stats for monitoring.
 */
export function getStoreStats(): {
  resumeCount: number;
  totalChunks: number;
} {
  let totalChunks = 0;
  for (const entry of store.values()) {
    totalChunks += entry.chunks.length;
  }
  return { resumeCount: store.size, totalChunks };
}

/**
 * Search for the top-K most similar chunks to a query embedding
 * within a single resume's stored chunks.
 *
 * @param resumeId - Resume to search within
 * @param queryEmbedding - The query's vector embedding
 * @param topK - Number of results to return (default: 5)
 * @param threshold - Minimum cosine similarity (default: 0.3)
 * @returns Sorted array of retrieval results (highest similarity first)
 */
export function searchSimilar(
  resumeId: string,
  queryEmbedding: number[],
  topK: number = 5,
  threshold: number = 0.3,
): RetrievalResult[] {
  const chunks = getChunks(resumeId);
  if (!chunks?.length) return [];

  const scored: RetrievalResult[] = [];

  for (const chunk of chunks) {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    if (score >= threshold) {
      scored.push({
        chunk: stripEmbedding(chunk),
        score,
      });
    }
  }

  // Sort by score descending, take topK
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Search across ALL stored resumes (for recruiter search use case).
 */
export function searchAllResumes(
  queryEmbedding: number[],
  topK: number = 10,
  threshold: number = 0.3,
): (RetrievalResult & { resumeId: string })[] {
  const results: (RetrievalResult & { resumeId: string })[] = [];

  for (const [resumeId, entry] of store.entries()) {
    // Skip expired
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      store.delete(resumeId);
      continue;
    }

    for (const chunk of entry.chunks) {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (score >= threshold) {
        results.push({
          resumeId,
          chunk: stripEmbedding(chunk),
          score,
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}

// ─── Math utilities ─────────────────────────────────────────────────

/**
 * Cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Strip embedding from chunk to reduce memory in results.
 */
function stripEmbedding(chunk: EmbeddedChunk): ResumeChunk {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { embedding: _embedding, ...rest } = chunk;
  return rest;
}
