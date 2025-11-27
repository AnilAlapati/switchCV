# AI Search Scaling Plan

> **Goal:** Ensure recruiter AI search remains fast and reliable from double-digit
> users all the way to viral spikes (1M+ resumes / thousands of concurrent
> searches) without firefighting.

---

## Evaluated Approaches

| #   | Strategy                                                    | Pros                                             | Cons                                                                | Verdict                                 |
| --- | ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- | --------------------------------------- |
| 1   | **Legacy in-function scan** (current before upgrade)        | Zero new infra, simple, works with <500 resumes  | O(N) Firestore reads per search, CPU-bound, dies instantly at scale | Retain only as emergency fallback       |
| 2   | **Firestore Native Vector Search** (HNSW via `findNearest`) | Same stack, auto-scaled, cheap, production-ready | Requires firebase-admin >= 12.7 + vector index, new API             | **Chosen as default provider**          |
| 3   | Qdrant / Pinecone (managed vector DB)                       | Purpose-built, sub-10ms latency                  | New service to manage, data sync complexity, $$                     | Post-100k resumes or multi-cloud needs  |
| 4   | Typesense / Algolia hybrid                                  | Excellent keyword/faceted UX                     | Still need vector DB, higher cost, more ops                         | Future UX upgrade                       |
| 5   | Weaviate (hybrid in one box)                                | Unified keyword+vector                           | Adds new runtime + cost now                                         | Evaluate only once usage > 500k resumes |

---

## Selected Architecture (Phase 1 → 1M resumes)

1. **Primary provider:** Firestore `findNearest` vector search
   - HNSW index on `resumes.embedding`
   - `firebase-admin` v12.7+
   - Configurable via `AI_SEARCH_PROVIDER=firestore-vector`
2. **Fallback provider:** Legacy scan (limited to 500 docs) for backwards
   compatibility or emergency rollback (`AI_SEARCH_PROVIDER=legacy`).
3. **Provider factory:** `functions/src/searchProviders/*`
   - `types.ts`: shared interfaces
   - `firestoreVectorProvider.ts`: native vector search
   - `legacyScanProvider.ts`: historical logic
   - `index.ts`: env-driven selection + automatic fallback
4. **Runtime safety:** `searchResumeService.ts` attempts primary provider and
   transparently fails over to legacy if Firestore vector search is temporarily
   unavailable (e.g., missing index or older SDK).

---

## Implementation Checklist

- [x] Add provider interfaces + factory
- [x] Wire `searchResumeService.ts` to provider abstraction
- [x] Document `AI_SEARCH_PROVIDER` env flag (DEV_MODE_GUIDE update)
- [ ] Ensure firebase-admin >= 12.7.0 in `functions/package.json`
- [ ] Create vector index: `resumes.embedding` (dimension 768, cosine)
- [ ] Set default env: `AI_SEARCH_PROVIDER=firestore-vector`
- [ ] Run smoke tests (dev + staging) to confirm provider logs & fallbacks

---

## Operational Notes

- **Quotas:** Firestore auto-scales; actual limit becomes Gemini embedding RPM.
  Request higher quotas in Google Cloud Console before running load tests.
- **Monitoring:** Each search logs provider name + scanned doc count. Set log
  alerts for fallback use or abnormal scan counts.
- **Migration:** If future scale demands a dedicated vector DB, reuse the
  `ResumeSearchProvider` interface to swap implementations without touching the
  API handler.

---

## Future Phases

1. **Phase 2 (50k+ resumes):** Add Typesense for keyword/facet pre-filtering,
   then vector similarity for top-N re-ranking.
2. **Phase 3 (500k+ resumes):** Evaluate Weaviate or Qdrant+Typesense combo for
   hybrid search and customizable relevance tuning.
