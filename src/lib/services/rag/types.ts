/**
 * RAG (Retrieval-Augmented Generation) Types
 *
 * Shared type definitions for the RAG pipeline:
 * chunking → embedding → storage → retrieval → LLM → evaluation → caching
 *
 * @module lib/services/rag/types
 */

/** A semantically meaningful chunk of resume content */
export interface ResumeChunk {
  /** Unique chunk identifier (resumeId + section + index) */
  id: string;
  /** The text content of the chunk */
  text: string;
  /** Section name this chunk came from */
  section:
    | "summary"
    | "skills"
    | "experience"
    | "education"
    | "projects"
    | "contact"
    | "personalInfo";
  /** Index within the section (for multi-chunk sections) */
  index: number;
  /** Word count of this chunk */
  wordCount: number;
  /** Optional metadata (company names, skill names, etc.) */
  metadata: Record<string, string>;
}

/** A chunk with its vector embedding attached */
export interface EmbeddedChunk extends ResumeChunk {
  /** 768-dimensional vector from Gemini text-embedding-004 */
  embedding: number[];
}

/** Result from similarity search */
export interface RetrievalResult {
  /** The matched chunk */
  chunk: ResumeChunk;
  /** Cosine similarity score (0–1, higher = more relevant) */
  score: number;
}

/** Options for RAG query */
export interface RAGQueryOptions {
  /** The user's question or search query */
  query: string;
  /** Resume ID to search within */
  resumeId: string;
  /** Number of top chunks to retrieve (default: 5) */
  topK?: number;
  /** Minimum similarity score threshold (default: 0.3) */
  similarityThreshold?: number;
  /** Max tokens for LLM response (default: 500) */
  maxTokens?: number;
  /** Temperature for LLM (default: 0.3 for factual) */
  temperature?: number;
  /** User ID for billing tracking */
  userId?: string;
}

/** Result from the full RAG pipeline */
export interface RAGResult {
  /** The generated answer */
  answer: string;
  /** Chunks used as context */
  sourceChunks: RetrievalResult[];
  /** Whether the answer was served from cache */
  cached: boolean;
  /** Factual alignment score (0–1) if evaluation ran */
  qualityScore?: number;
  /** Number of LLM attempts (1 = first try success) */
  attempts: number;
  /** LLM model used */
  model?: string;
  /** LLM provider used */
  provider?: string;
}

/** Options for the evaluation + retry wrapper */
export interface EvalRetryOptions {
  /** Minimum acceptable quality score (default: 0.7) */
  scoreThreshold?: number;
  /** Maximum retry attempts (default: 2) */
  maxRetries?: number;
}
