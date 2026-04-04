# RAG System (Retrieval-Augmented Generation)

**Location:** `src/lib/services/rag/`  
**Status:** Production-ready, fully tested (52/52 tests pass)  
**Entry point:** `src/lib/services/rag/index.ts`

---

## What It Does

The RAG system answers natural-language questions about a resume by:

1. **Chunking** the structured `ResumeProfile` JSON into section-aware text segments
2. **Embedding** each chunk as a 768-dimensional vector (Gemini `text-embedding-004`)
3. **Storing** vectors in an in-memory store, keyed by `resumeId` with a 1-hour TTL
4. **Retrieving** the most relevant chunks at query time using cosine similarity
5. **Generating** an answer via the existing `generateText` provider chain (Gemini→OpenAI→Groq→Claude)
6. **Evaluating** the answer quality and retrying with a tighter prompt if the score is below threshold
7. **Caching** responses by SHA-256 hash of `(query, chunkIds)` for 30 minutes

---

## Architecture

```
queryWithRAG(profile, options, evalOptions?)
  │
  ├─ retrieveRelevantChunks()  ← retrievalService.ts
  │    ├─ hasValidChunks()?     ← vectorStore.ts (in-memory, TTL=1h)
  │    │   no → indexResume()
  │    │         └─ chunkResume()   ← chunkingService.ts
  │    │         └─ embedChunks()   ← 3 parallel Gemini calls
  │    │         └─ setChunks()     ← vectorStore.ts
  │    └─ searchSimilar()      ← cosine similarity
  │
  ├─ getCachedResponse()       ← responseCache.ts (SHA-256, TTL=30min)
  │   hit → return {cached: true}
  │
  ├─ buildRAGPrompt(context, query)
  │
  ├─ Loop (up to maxRetries+1):
  │     generateText(prompt)
  │     evaluateRAGResponse(answer, chunks, query) → score
  │     score ≥ threshold → break
  │     score < threshold → rebuild prompt with grounding reminder
  │
  ├─ setCachedResponse()
  │
  └─ return RAGResult
```

---

## File Reference

| File                      | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `rag/types.ts`            | All shared TypeScript interfaces                      |
| `rag/chunkingService.ts`  | Converts `ResumeProfile` JSON → `ResumeChunk[]`       |
| `rag/vectorStore.ts`      | In-memory vector store with TTL and cosine similarity |
| `rag/retrievalService.ts` | Lazy index-on-demand + similarity search              |
| `rag/ragService.ts`       | Main orchestrator: LLM call + eval + retry + caching  |
| `rag/responseCache.ts`    | SHA-256 keyed LLM response cache                      |
| `rag/index.ts`            | Barrel export                                         |

---

## Key Types

```typescript
// Input
interface RAGQueryOptions {
  query: string; // Natural language question
  resumeId: string; // Firestore document ID
  topK?: number; // Max chunks to retrieve (default: 5)
  similarityThreshold?: number; // Min cosine similarity (default: 0.3)
  maxTokens?: number; // LLM max tokens (default: 500)
  temperature?: number; // LLM temperature (default: 0.3)
  userId?: string; // For billing / logging
}

interface EvalRetryOptions {
  scoreThreshold?: number; // Min quality score 0–1 (default: 0.7)
  maxRetries?: number; // Retry attempts (default: 2)
}

// Output
interface RAGResult {
  answer: string;
  sourceChunks: RetrievalResult[]; // Which chunks backed the answer
  cached: boolean;
  qualityScore: number; // Final evaluation score (0–1)
  attempts: number; // How many LLM calls were made
  model: string; // e.g. "gemini-1.5-pro"
  provider: string; // e.g. "gemini"
}
```

---

## Usage

### Query a resume

```typescript
import { queryWithRAG } from "@/lib/services/rag";

const result = await queryWithRAG(
  resumeProfile, // ResumeProfile object
  { query: "What stack does this engineer use?", resumeId: "resume-123" },
  { scoreThreshold: 0.65, maxRetries: 2 }, // optional
);

console.log(result.answer); // "They use React, TypeScript, and Node.js..."
console.log(result.sourceChunks); // [{ chunk: {...}, score: 0.87 }]
console.log(result.cached); // false (first call), true (cache hit)
```

### Pre-index a resume (warm the vector store at publish time)

```typescript
import { preIndexResume } from "@/lib/services/rag";

// Fire-and-forget — do not await in hot paths
preIndexResume(resumeProfile, resumeId).catch((err) =>
  logger.error({ err }, "Pre-index failed — will index lazily on first query"),
);
```

---

## Chunking Strategy

The chunker produces **one chunk per item** within each section:

| Section        | Chunk content                                              |
| -------------- | ---------------------------------------------------------- |
| `summary`      | Plain text                                                 |
| `skills`       | Grouped by level: Expert, Intermediate, Beginner           |
| `experience[]` | One chunk per job: role, company, dates, description       |
| `education[]`  | One chunk per degree: institution, degree, field, dates    |
| `projects[]`   | One chunk per project: name, description, tech stack, URLs |
| `contact`      | Email, phone, location, LinkedIn, GitHub, website          |

Chunks that fall below 50 words are merged with the previous chunk.  
Chunks above 500 words are split on sentence boundaries.

---

## Evaluation Scoring

`evaluateRAGResponse(answer, chunks, query)` returns a score from 0–1:

| Component       | Weight | What it checks                                         |
| --------------- | ------ | ------------------------------------------------------ |
| Term coverage   | 50%    | Key terms from chunk text appear in answer             |
| Query relevance | 30%    | Query's key terms appear in answer                     |
| Avg chunk score | 20%    | Average cosine similarity of retrieved chunks          |
| Length penalty  | ×0.8   | Applied when answer is 1.5× longer than source context |

Terms extracted: proper nouns (capitalized words), numbers, tech keywords, years.

If the score is below `scoreThreshold`, the orchestrator retries with a prompt that asks the model to stay strictly grounded in the provided context.

---

## Integration Points

### `recruiterAgentService.ts` — `analyzeMatch` and `screenCandidate`

Both functions accept an optional `resumeProfile?: ResumeProfile` on the `CandidateProfile` argument. When present, they call `retrieveRelevantChunks` to build targeted context instead of passing the raw bio text.

```typescript
const candidate: CandidateProfile = {
  resumeId: "resume-123",
  resumeProfile: fetchedProfile, // ← adds RAG context
  // ... other fields
};

const matchResult = await analyzeMatch(jobPosting, candidate);
```

### `api/resumes/create/route.ts`

After a public resume is written to Firestore, `preIndexResume` is called fire-and-forget to warm the vector store proactively. Failure is non-fatal and logged.

---

## Limits and TTLs

| Setting               | Value                      |
| --------------------- | -------------------------- |
| Vector store TTL      | 1 hour                     |
| Response cache TTL    | 30 minutes                 |
| Max chunks per resume | 200                        |
| Response cache size   | 500 entries (LRU eviction) |
| Embedding concurrency | 3 parallel Gemini calls    |

---

## Known Limitations

1. **In-memory only** — Vector store is lost on process restart. Future: persist embeddings to the `embedding` field already present on `PublishedResume` in Firestore.
2. **Heuristic evaluation** — `evaluateRAGResponse` uses term-overlap heuristics. For high-stakes queries, swap in `evaluateFactualAlignment()` from `resumeGenerationQuality.ts`.
3. **No rate-limit backoff** — `embedChunks` uses 3 parallel workers but has no retry on `429`. The `generateEmbedding` function handles this at the provider level.

---

## Tests

All tests live in `src/lib/services/__tests__/`:

| File                        | Tests | Coverage                                                  |
| --------------------------- | ----- | --------------------------------------------------------- |
| `rag-chunking.test.ts`      | 12    | `chunkResume`, `chunkRawText`, `countWords`               |
| `rag-vectorStore.test.ts`   | 19    | Cosine similarity, CRUD, TTL, similarity search           |
| `rag-responseCache.test.ts` | 10    | Key generation, TTL, eviction                             |
| `rag-ragService.test.ts`    | 11    | Full orchestrator: happy path, caching, retry, edge cases |

Run: `npx jest rag-`
