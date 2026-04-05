/**
 * RAG Module — Barrel Export
 *
 * Re-exports all RAG services for clean imports:
 *   import { queryWithRAG, chunkResume } from "@/lib/services/rag";
 *
 * @module lib/services/rag
 */

// Types
export type {
  ResumeChunk,
  EmbeddedChunk,
  RetrievalResult,
  RAGQueryOptions,
  RAGResult,
  EvalRetryOptions,
  ConversationTurn,
} from "./types";

// Chunking
export { chunkResume, chunkRawText, countWords } from "./chunkingService";

// Vector Store
export {
  setChunks,
  getChunks,
  hasValidChunks,
  clearChunks,
  clearAll as clearVectorStore,
  getStoreStats,
  searchSimilar,
  searchAllResumes,
  cosineSimilarity,
} from "./vectorStore";

// Retrieval
export {
  indexResume,
  indexRawText,
  retrieveRelevantChunks,
  buildContextFromChunks,
} from "./retrievalService";

// Response Cache
export {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  clearResponseCache,
  getResponseCacheStats,
} from "./responseCache";

// RAG Orchestrator (main entry point)
export { queryWithRAG, preIndexResume } from "./ragService";
