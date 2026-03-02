# Resume Quality Fix v2 — Structured Output Migration + Generation Validation

**Date**: March 1, 2026  
**Predecessor**: [Resume_Quality_Fix_pan_Feb_28.md](Resume_Quality_Fix_pan_Feb_28.md) (v1 — regex hardening, intake normalizer, factual alignment)  
**Scope**: Replace fragile regex-based extraction and freeform AI parsing with Gemini Structured Output, then validate end-to-end generation quality

---

## 📊 Progress Summary

| Phase | Description                                  | Tests | Status                                 |
| ----- | -------------------------------------------- | ----- | -------------------------------------- |
| **A** | Gemini Structured Output for Generation      | 23    | ✅ COMPLETE                            |
| **B** | Structured Extraction (AI + Feature Flags)   | 33    | ✅ COMPLETE                            |
| **C** | Generation Quality Validation + Orchestrator | 55    | ✅ COMPLETE (41 KPI + 14 orchestrator) |
| **D** | Gold Dataset Expansion (60 → 200 cases)      | —     | ✅ COMPLETE                            |
| **E** | Observability + Production Hardening         | —     | ✅ COMPLETE (7/7 done)                 |
| **F** | Live AI Evaluation Script                    | —     | ✅ COMPLETE                            |
| **G** | Multi-Agent Revision Loop Testing            | 36    | ✅ COMPLETE                            |

**Total tests passing**: 33/33 (KPI gate) ✅, 36/36 (multi-agent revision loop) ✅  
**TypeScript errors**: 0  
**Phase D**: ✅ COMPLETE — 200 cases added (80 chat, 60 paste, 60 PDF)  
**Phase E**: ✅ COMPLETE — Sentry breadcrumbs added at 7 pipeline checkpoints  
**Phase F**: ✅ COMPLETE — eval script (scripts/eval-generation-quality.js) + DEPLOYMENT_CHECKLIST.md updated  
**Phase G**: ✅ COMPLETE — 36 multi-agent revision loop tests (orchestrator revision loop, AuditorAgent, WritingAgent)

---

## What v1 Fixed (Feb 28 — DONE)

| Area                 | What was done                                                                                                                                | Status             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Extraction hardening | ContactExtractor (8 patterns), ExperienceExtractor (13 patterns), SkillsExtractor (boundary matching), EducationExtractor (no year defaults) | ✅                 |
| Intake normalizer    | `ResumeIntakeNormalizer` — section segmentation, Unicode preservation, evidence map                                                          | ✅                 |
| Factual alignment    | `evaluateFactualAlignment()` — summary metrics, experience bullets, scope claims, non-numeric assertions                                     | ✅                 |
| Schema contract      | `validateStructuredResumeContract()` — strict mode, required fields                                                                          | ✅                 |
| Repair loop          | Single repair pass with explicit validation errors → re-validate before persist                                                              | ✅                 |
| Creative polisher    | `resumeCreativePolisher.ts` — evidence-backed, confidence annotation, auto-revert                                                            | ✅ (flag disabled) |
| Signal template      | `signal-v1` — engineering-first, ATS-safe                                                                                                    | ✅                 |
| Gold dataset         | 200 cases (80 chat, 60 paste, 60 PDF)                                                                                                        | ✅ (Phase D done)  |
| KPI gate test        | `resumeLaunchGateKPI.test.ts` — 33 tests, extraction thresholds enforced (≥80 chat, ≥60 paste, ≥60 PDF)                                      | ✅                 |
| Quality-check.sh     | KPI test wired into critical test pattern                                                                                                    | ✅                 |

---

## What v1 Did NOT Fix (The Gaps)

### Gap 1: Gemini Structured Output Not Used — HIGH

**Current**: The orchestrator asks Gemini to produce JSON inside markdown fences (` ```json ... ``` `), then `extractResumeJSON()` regex-parses it out.  
**Problem**: The AI can produce malformed JSON, missing fences, extra text, truncated output. This causes silent generation failures.  
**Fix**: Gemini API already supports `responseMimeType: "application/json"` + `responseSchema` in `generationConfig`. We already have the Zod schema (`AIResumeResponseSchema`). Two fields added to the API call = guaranteed valid JSON.  
**Cost impact**: $0 — uses existing API key.

### Gap 2: Extractors Are Regex-Only — HIGH

**Current**: 4 extractors (Contact, Experience, Education, Skills) use hardcoded regex patterns. We spent 2 sessions adding patterns (5→8 name patterns, 5→13 experience patterns) and still only hit 75% experience extraction.  
**Problem**: Every unusual resume format requires a new regex pattern. This does not scale.  
**Fix**: Replace regex extractors with a single Gemini structured output call for extraction. Keep regex as fallback when AI is down.  
**Cost impact**: ~$0.001/extraction with Gemini Flash = ~$1/month at 1000 resumes.

### Gap 3: No Orchestrator Tests — HIGH

**Current**: `resumeGenerationOrchestrator.ts` is 527 lines, handles the entire generation flow, and has **ZERO dedicated tests**.  
**Problem**: Any change to the orchestrator can silently break generation with no test catching it.  
**Fix**: Create `resumeGenerationOrchestrator.test.ts` with mocked AI responses covering all flow branches.

### Gap 4: Generation Quality Not Validated Against Gold Dataset — HIGH

**Current**: The KPI gate tests extraction quality only. No test validates what happens AFTER extraction — the AI generation, JSON parsing, schema validation, factual alignment, and repair loop.  
**Problem**: We've proven extractors work, but we have no proof the generated resumes are good.  
**Fix**: Create `resumeGenerationQualityKPI.test.ts` with synthetic AI responses paired with gold dataset evidence.

### Gap 5: Gold Dataset at 30% — MEDIUM

**Current**: 60 cases. Target: 200.  
**Problem**: 60 cases may not cover enough format/persona diversity for a reliable KPI gate.  
**Fix**: Expand to 140 more cases (45 chat + 44 paste + 51 PDF).

### Gap 6: cacheService Exists But Is Never Used — MEDIUM

**Current**: `cacheService.ts` (263 lines) implements L1 in-memory + L2 Firestore caching. **No file imports it.**  
**Problem**: Every Firestore read hits the network. Estimated ~$2,190/yr in avoidable costs.  
**Fix**: Wire cacheService into resume reads, user settings, and feature flags.

### Gap 7: PostHog Events Are Log-Only — MEDIUM

**Current**: `useAnalyticsTracking` hook logs to console. `posthog.capture()` is never called.  
**Problem**: No user analytics in production. Can't measure real user quality signals (edit rate, rejection rate).  
**Fix**: Wire PostHog capture in the analytics hook + add generation quality events.

### Gap 8: Sentry Used in 1 File Only — MEDIUM

**Current**: `reportError()` exists but is only called from `useAuthActions.ts`. The orchestrator, AI providers, and extractors use `logger.error()` only.  
**Problem**: Generation errors are invisible in Sentry. No alerting on failure spikes.  
**Fix**: Add `reportError()` calls to orchestrator catch blocks and AI provider failures.

### Gap 9: Rate Limiting Is In-Memory Only — MEDIUM

**Current**: Edge rate limiter uses in-memory Map. Resets on every serverless cold start.  
**Problem**: No real DDoS protection. No per-user rate limiting.  
**Fix**: Add Firestore or Redis-backed counter for persistent rate state. Add per-user limits on `/api/resume/generate`.

### Gap 10: costControlService Not Implemented — MEDIUM

**Current**: Agentic pipeline uses `BillingService.trackCost()` but the sharded counter service from the plan doesn't exist (only a test file).  
**Problem**: No hard budget enforcement for the $30/$70 monthly cap.  
**Fix**: Implement `costControlService.ts` with sharded counters.

---

## v2 Plan — Phased Implementation

### Phase A: Gemini Structured Output for Generation (Week 1) ✅ COMPLETE

**Goal**: AI responses are guaranteed valid JSON — no regex parsing, no markdown fences.

| #   | Task                                                                                     | File(s)                                          | Effort | Status |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ | ------ | ------ |
| A1  | Add `responseMimeType` + `responseSchema` support to `generateWithGemini()`              | `ai/providers/gemini.ts`                         | S      | ✅     |
| A2  | Create `zodToGeminiSchema()` utility to convert Zod schemas to Gemini JSON Schema format | `lib/utils/zodToGeminiSchema.ts` (new)           | S      | ✅     |
| A3  | Add `structuredOutput` option to `generateTextWithTier()` and `generateText()`           | `aiProviderService.ts`, `aiGenerationService.ts` | M      | ✅     |
| A4  | Update orchestrator to pass `responseSchema` when `resume_v2_writer` is enabled          | `resumeGenerationOrchestrator.ts`                | M      | ✅     |
| A5  | Remove `extractResumeJSON()` dependency from orchestrator — response IS the JSON         | `resumeGenerationOrchestrator.ts`                | S      | ✅     |
| A6  | Validate with `AIResumeResponseSchema.safeParse()` on the structured response            | `resumeGenerationOrchestrator.ts`                | S      | ✅     |
| A7  | Add OpenAI/Groq structured output support (JSON mode) as fallback                        | `ai/providers/openai.ts`, `ai/providers/groq.ts` | M      | ✅     |
| A8  | Tests: structured output parsing, schema fallback, malformed response handling           | Tests (new)                                      | M      | ✅     |

**Acceptance**: AI responses are valid JSON 100% of the time. `extractResumeJSON()` used only as legacy fallback.
**Completed**: All 23 tests passing (18 zodToGeminiSchema + 5 structuredOutput integration). Zod v4 compatible.

### Phase B: Gemini Structured Output for Extraction (Week 1–2) ✅ COMPLETE

**Goal**: Replace 4 regex extractors with a single AI extraction call. Regex demoted to offline fallback.

| #   | Task                                                                                                               | File(s)                                       | Effort | Status |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------ | ------ |
| B1  | Define extraction schema: `ResumeExtractionSchema` (Zod) for name/email/phone/location/skills/experience/education | `lib/schemas/resumeExtractionSchema.ts` (new) | S      | ✅     |
| B2  | Create `extractWithStructuredOutput()` function — sends user text + schema to Gemini                               | `lib/services/aiExtractionService.ts` (new)   | M      | ✅     |
| B3  | Add temperature=0.1 and extraction-specific system prompt                                                          | `lib/services/aiExtractionService.ts`         | S      | ✅     |
| B4  | Update `ResumeDataExtractor.extractFromConversation()` to prefer AI extraction, fall back to regex                 | `resumeDataExtractor.ts`                      | M      | ✅     |
| B5  | Update `ResumeIntakeNormalizer.normalize()` to use AI extraction for paste/PDF sources                             | `resumeIntakeNormalizer.ts`                   | M      | ✅     |
| B6  | Gate behind feature flag: `resume_v2_ai_extraction` (default: enabled for premium+, disabled for basic)            | `featureFlagService.ts`                       | S      | ✅     |
| B7  | Update gold dataset KPI test to validate AI extraction path                                                        | `resumeLaunchGateKPI.test.ts`                 | M      | ✅     |
| B8  | Performance benchmark: regex vs AI extraction latency + cost on 60 gold cases                                      | Script (new)                                  | S      | ✅     |

**Acceptance**: AI extraction rate ≥95% across all KPI fields. Regex fallback still works when AI is down. Cost <$0.002/extraction.
**Completed**: All 33 tests passing (26 existing + 7 new AI extraction tests). System prompt, Zod schema validation, feature flag, and benchmark script all implemented.

### Phase C: Generation Quality Validation (Week 2) — ✅ COMPLETE

**Goal**: Prove the full generation pipeline produces high-quality resumes against the gold dataset.

| #   | Task                                                                                                          | File(s)                                                             | Effort | Status |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------ | ------ |
| C1  | Create 30 synthetic "golden AI responses" — 15 clean, 10 hallucinated, 5 malformed                            | `__tests__/lib/data/generationGoldResponses.ts` (new)               | M      | ✅     |
| C2  | Create `resumeGenerationQualityKPI.test.ts` — runs validation functions against golden responses              | `__tests__/lib/services/resumeGenerationQualityKPI.test.ts` (new)   | L      | ✅     |
| C3  | KPIs: schema pass ≥95%, schema reject 100%, hallucination detect ≥90%, false positive ≤10%, completeness ≥85% | (in C2)                                                             | —      | ✅     |
| C4  | Create `resumeGenerationOrchestrator.test.ts` — mock AI, test all branches                                    | `__tests__/lib/services/resumeGenerationOrchestrator.test.ts` (new) | L      | ✅     |
| C5  | Test branches: normal flow, repair loop, creative polish, clarification, preview mode, auth failure           | (in C4)                                                             | —      | ✅     |
| C6  | Wire `resumeGenerationQualityKPI` into `quality-check.sh` critical test pattern                               | `scripts/quality-check.sh`                                          | S      | ✅     |

**Completed**: 41/41 KPI tests passing (all 6 KPIs met). 14/14 orchestrator branch tests passing (8 branches + 6 edge cases). Fixed orchestrator data merge bug — extracted name/email now properly merged with AI-generated structured data before validation.

### Phase D: Gold Dataset Expansion (Week 2–3) — ✅ COMPLETE

**Goal**: Reach 200-case gold dataset for robust KPI enforcement.

| #   | Task                                                                                              | File(s)                                                   | Effort | Status |
| --- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------ | ------ |
| D1  | Add 45 chat cases: career changers, international, non-tech, gaps, freelancers                    | `evaluationGoldDataset.ts`                                | L      | ✅     |
| D2  | Add 44 paste cases: varied separators, multi-page, creative layouts, non-English names            | `evaluationGoldDataset.ts`                                | L      | ✅     |
| D3  | Add 51 PDF-simulated cases: scanned/OCR noise, multi-column, table-based, header/footer artifacts | `evaluationGoldDataset.ts`                                | L      | ✅     |
| D4  | Update `GOLD_DATASET_STATS` and test expectations for 200 cases                                   | `evaluationGoldDataset.ts`, `resumeLaunchGateKPI.test.ts` | S      | ✅     |
| D5  | Re-run KPI gate on 200 cases — fix any newly failing extraction patterns                          | Extractors                                                | M      | ✅     |

**Current**: 200 cases (80 chat, 60 paste, 60 PDF). ✅ Target reached.  
**Achieved**: chatInternational (15) + chatGapsFreelancers (15) + chatNonTech (15) + pasteExpanded (44) + pdfExpanded (51) added to `evaluationGoldDataset.ts`.

**Acceptance**: 200 cases. KPI thresholds still pass. Distribution: ≥80 chat, ≥60 paste, ≥60 PDF.

### Phase E: Observability + Production Hardening (Week 3) — ✅ COMPLETE

**Goal**: Generation quality is monitored in production with alerting.

| #   | Task                                                                                                     | File(s)                                    | Effort | Status |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------ | ------ |
| E1  | Wire PostHog `capture()` in analytics hook for real event delivery                                       | `useAnalyticsTracking.ts`                  | S      | ✅     |
| E2  | Add generation quality events: `resume_generated`, `resume_generation_failed`, `resume_repair_triggered` | `resumeGenerationOrchestrator.ts`          | M      | ✅     |
| E3  | Add `reportError()` to orchestrator, AI providers, and extractor catch blocks                            | Multiple files                             | M      | ✅     |
| E4  | Wire `cacheService` into feature flag reads and resume fetches                                           | `featureFlagService.ts`, `resumeCrud.ts`   | M      | ✅     |
| E5  | Add per-user rate limit to `/api/resume/generate` (max 10 generations/hour)                              | `api/resume/generate/route.ts`             | M      | ✅     |
| E6  | Implement `costControlService.ts` sharded counters for agentic budget enforcement                        | `lib/services/costControlService.ts` (new) | L      | ✅     |
| E7  | Add Sentry breadcrumbs to orchestrator pipeline steps                                                    | `resumeGenerationOrchestrator.ts`          | S      | ✅     |

**Completed (E1–E7)**: PostHog `capture()` wired in `useAnalyticsTracking.ts` — fires on every tracked event when consent is granted. Server-side `serverAnalytics.ts` utility created (PostHog HTTP capture, graceful no-op when key absent). Orchestrator emits `resume_generated`, `resume_generation_failed`, and `resume_repair_triggered` events with pipeline/tier metadata. `reportError()` added to all three orchestrator catch blocks (tiered AI failure, repair loop failure, resume create failure). `cacheService` wired into `featureFlagService.ts` (L1+L2 cache for flag reads, TTL 5 min; invalidation via `cacheService.invalidate/invalidatePattern`) and `api-helpers.ts` (resume document reads cached 15 min, cache-aside pattern; `updateResume` and `deleteResume` in `resumeCrud.ts` invalidate on write). Per-user resume generation hard cap (10/hour) added to `generate/route.ts` via `RESUME_GENERATION_HARD_CAP` from `rateLimits.ts` — enforced on top of existing tier-based `ai_generation` limits. `costControlService.ts` created with sharded Firestore counters (`agenticCosts/system/shards`, 10 shards), per-user monthly tracking (`agenticCosts/users`), budget caps ($30 standard / $70 enterprise), `trackAgenticCost()`, `checkAgenticBudget()`, `checkUserAgenticBudget()`, `getSystemAgenticMonthlyCost()`, `getUserMonthlyAgenticCost()`, and `getStats()` methods. Sentry breadcrumbs added via `addPipelineBreadcrumb()` helper at 7 orchestrator checkpoints: flags evaluated, data extraction complete, AI generation complete, starting resume creation, repair loop triggered, resume created, resume creation failed — all wrapped in try/catch so Sentry unavailability never blocks generation.

**Acceptance**: PostHog receiving real events. Sentry capturing generation errors with context. Cache hit rate >50% for flag reads.

### Phase F: Live AI Evaluation Script (Week 3–4, Optional) — ✅ COMPLETE

**Goal**: Manual pre-deploy quality check that runs real AI on gold cases.

| #   | Task                                                                                 | File(s)                              | Effort | Status |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------ | ------ | ------ |
| F1  | Create `scripts/eval-generation-quality.js` — runs 10 gold cases through real Gemini | `scripts/eval-generation-quality.js` | M      | ✅     |
| F2  | Report: schema valid %, factual alignment %, avg latency, cost per resume            | (in F1)                              | —      | ✅     |
| F3  | Add to `DEPLOYMENT_CHECKLIST.md` as pre-deploy manual step                           | `docs/DEPLOYMENT_CHECKLIST.md`       | S      | ✅     |

**Completed**: `scripts/eval-generation-quality.js` — pure Node.js (no Firebase dependency), calls Gemini REST API directly with `GEMINI_API_KEY` env var, selects 10 cases (4 chat + 3 paste + 3 PDF) deterministically from gold dataset, evaluates schema validity + field accuracy (name, email, skills, experience), reports avg latency + cost per resume. Thresholds: schema valid ≥95%, field accuracy ≥90%, avg latency ≤5000ms, total cost ≤$0.50. Exits 0 on pass, 1 on fail. `DEPLOYMENT_CHECKLIST.md` updated with new section 3b ("AI Generation Quality Check — Production Only") including expected output, per-metric thresholds table, and chainable shell example.

**Acceptance**: Script runs in <60s, costs <$0.50, produces human-readable quality report. ✅

---

### Phase G: Multi-Agent Revision Loop Testing (March 2) — ✅ COMPLETE

**Goal**: Prove the 4-agent autonomous pipeline (Research → Planning → Writing → Auditor) handles the revision loop correctly and all gateway conditions work as specified.

| #   | Task                                                                                                      | File(s)                                                                   | Effort | Status |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ | ------ |
| G1  | Orchestrator revision loop tests (16 branches)                                                            | `src/lib/services/__tests__/agentOrchestrator.revisionLoop.test.ts` (new) | M      | ✅     |
| G2  | `AuditorAgent` unit tests (9 cases): PASS, NEEDS_WORK, buildPrompt, fallback parse, error handling        | `src/lib/services/agents/__tests__/AuditorAgent.test.ts` (new)            | S      | ✅     |
| G3  | `WritingAgent` unit tests (11 cases): prompt construction, instructions injection, fallback parse, errors | `src/lib/services/agents/__tests__/WritingAgent.test.ts` (new)            | S      | ✅     |
| G4  | Wire agentic tests into `quality-check.sh` critical test pattern                                          | `scripts/quality-check.sh`                                                | S      | ✅     |

**Completed**: 36/36 tests passing (16 orchestrator revision loop + 9 AuditorAgent + 11 WritingAgent). Tests cover: revision loop success path (revised markdown used), revision fallback (original used when re-write fails), empty critique guard (revision skipped when critique is falsy), standard 2-agent workflow, kill switch, budget cap, user limit, cost tracking for free/premium tiers, context injection (critique appended to writer instructions), and full AuditorAgent/WritingAgent unit coverage including buildPrompt, parseOutput fallbacks, and error handling. Cross-test contamination guard added via `mockReset()` in `beforeEach`. All three test files wired into `quality-check.sh` critical pattern.

**Acceptance**: 36 tests pass. Auditor NEEDS_WORK → Writer revision loop is fully verified. ✅

---

## What's NOT In Scope (Acknowledged but Deferred)

| Item                                                | Why deferred                                                       | When to revisit                     |
| --------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| Vector search / semantic resume matching            | Not needed for generation quality                                  | Post-launch (search feature)        |
| Narrative/Studio post-launch templates              | 11 templates already exist; quality > quantity                     | Post-launch (user feedback)         |
| Distributed rate limiting (Redis)                   | In-memory + per-user limit sufficient for MVP scale                | When traffic exceeds 100 RPM        |
| ~~Multi-agent revision loop testing~~               | ✅ DONE — see Phase G (March 2)                                    | —                                   |
| Google Document AI for PDF OCR                      | Current pdf-parse handles digital PDFs fine; scanned PDFs are rare | When scanned PDF reports increase   |
| International format support (non-Latin names, RTL) | Requires i18n foundation work                                      | Post-launch international expansion |

---

## Effort Summary

| Phase | Description                           | Effort         | Tasks        | Status       |
| ----- | ------------------------------------- | -------------- | ------------ | ------------ |
| **A** | Gemini Structured Output — Generation | ~3 days        | 8 tasks      | ✅ COMPLETE  |
| **B** | Gemini Structured Output — Extraction | ~3 days        | 8 tasks      | ✅ COMPLETE  |
| **C** | Generation Quality Validation         | ~3 days        | 6 tasks      | ✅ COMPLETE  |
| **D** | Gold Dataset Expansion to 200         | ~2 days        | 5 tasks      | ✅ COMPLETE  |
| **E** | Observability + Production Hardening  | ~3 days        | 7 tasks      | ✅ COMPLETE  |
| **F** | Live AI Evaluation Script (optional)  | ~1 day         | 3 tasks      | ✅ COMPLETE  |
| **G** | Multi-Agent Revision Loop Testing     | ~0.5 days      | 3 new files  | ✅ COMPLETE  |
|       | **Total**                             | **~15.5 days** | **40 items** | **40/40** ✅ |

---

## Success Criteria (Launch-Blocking KPIs)

| KPI                                        | Threshold                              | Measured by      |
| ------------------------------------------ | -------------------------------------- | ---------------- |
| Structured output compliance               | 100% — all AI responses are valid JSON | Phase A tests    |
| Extraction accuracy (AI path)              | ≥95% across name/email/skills/exp+edu  | Phase B KPI test |
| Schema validation pass rate (clean inputs) | ≥95%                                   | Phase C KPI test |
| Hallucination detection rate               | ≥90%                                   | Phase C KPI test |
| Factual alignment average                  | ≥90%                                   | Phase C KPI test |
| False positive rate on clean resumes       | ≤10%                                   | Phase C KPI test |
| Gold dataset coverage                      | 200 cases                              | Phase D          |
| Orchestrator test coverage                 | ≥80% line coverage                     | Phase C test     |

---

## Decision Log

| Decision                 | Choice                                                       | Rationale                                                        |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| AI extraction provider   | Gemini (same as generation)                                  | Already paying for it; structured output support; lowest latency |
| Extraction fallback      | Keep regex extractors as offline fallback                    | Zero-cost, no API dependency, works when AI is down              |
| Extraction tier gating   | AI extraction for premium+; regex for basic tier             | Keeps basic tier at $0 AI cost                                   |
| Structured output format | Gemini `responseMimeType` + `responseSchema`                 | Native API feature; guaranteed valid JSON; no post-processing    |
| Schema source            | Existing `AIResumeResponseSchema` (Zod)                      | Already defined, tested, covers all fields                       |
| Test strategy            | Deterministic with synthetic AI responses (no live AI in CI) | Zero cost, reproducible, fast, no flaky tests                    |
| cacheService activation  | Yes — for flags + resume reads                               | Already implemented, just unused; estimated $2K/yr savings       |

---

## Risk Register

| Risk                                                   | Likelihood | Impact | Mitigation                                                                      |
| ------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------- |
| Gemini structured output changes API format            | Low        | High   | Version-pin API, validate response shape in tests                               |
| AI extraction slower than regex                        | Medium     | Low    | Benchmark in Phase B8; regex fallback always available                          |
| 200-case dataset takes longer than 2 days              | Medium     | Low    | Prioritize quality over quantity; 150 is acceptable minimum                     |
| Structured output unavailable for OpenAI/Groq fallback | Low        | Medium | Both support JSON mode; Phase A7 covers this                                    |
| Cache invalidation bugs                                | Medium     | Medium | Conservative TTLs (5 min flags, 15 min resumes); explicit invalidation on write |

---

## Files That Will Be Created

| File                                                                | Phase | Purpose                                                                     |
| ------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------- |
| `src/lib/utils/zodToGeminiSchema.ts`                                | A     | Zod → Gemini JSON Schema converter                                          |
| `src/lib/schemas/resumeExtractionSchema.ts`                         | B     | Extraction-specific schema for AI structured output                         |
| `src/lib/services/aiExtractionService.ts`                           | B     | AI-powered field extraction with structured output                          |
| `src/__tests__/lib/data/generationGoldResponses.ts`                 | C     | Synthetic AI responses for generation quality testing                       |
| `src/__tests__/lib/services/resumeGenerationQualityKPI.test.ts`     | C     | Generation quality KPI gate test                                            |
| `src/__tests__/lib/services/resumeGenerationOrchestrator.test.ts`   | C     | Orchestrator branch coverage tests                                          |
| `src/lib/services/serverAnalytics.ts`                               | E     | Server-side PostHog HTTP capture utility                                    |
| `src/lib/services/costControlService.ts`                            | E     | ✅ Sharded counter budget enforcement ($30/$70 caps)                        |
| `scripts/eval-generation-quality.js`                                | F     | Pre-deploy live AI quality check                                            |
| `src/lib/services/__tests__/agentOrchestrator.revisionLoop.test.ts` | G     | 16-test suite: revision loop, gateway checks, cost tracking, context inject |
| `src/lib/services/agents/__tests__/AuditorAgent.test.ts`            | G     | 9-test unit suite: PASS/NEEDS_WORK/parseOutput fallbacks/error handling     |
| `src/lib/services/agents/__tests__/WritingAgent.test.ts`            | G     | 11-test unit suite: prompt construction, instructions injection, fallbacks  |

## Files That Will Be Modified

| File                                                     | Phase | Change                                                                         |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------------------------ |
| `src/lib/services/ai/providers/gemini.ts`                | A     | Add `responseMimeType` + `responseSchema` to config                            |
| `src/lib/services/aiProviderService.ts`                  | A     | Pass structured output options                                                 |
| `src/lib/services/aiGenerationService.ts`                | A     | Pass structured output options                                                 |
| `src/lib/services/resumeGenerationOrchestrator.ts`       | A, E  | Use structured response; add PostHog events, Sentry                            |
| `src/lib/services/ai/providers/openai.ts`                | A     | Add JSON mode support                                                          |
| `src/lib/services/ai/providers/groq.ts`                  | A     | Add JSON mode support                                                          |
| `src/lib/services/resumeDataExtractor.ts`                | B     | Prefer AI extraction, regex fallback                                           |
| `src/lib/services/resumeIntakeNormalizer.ts`             | B     | AI extraction for paste/PDF                                                    |
| `src/lib/services/featureFlagService.ts`                 | B     | Add `resume_v2_ai_extraction` flag                                             |
| `src/__tests__/lib/data/evaluationGoldDataset.ts`        | D     | Expand to 200 cases                                                            |
| `src/__tests__/lib/services/resumeLaunchGateKPI.test.ts` | D     | Update expectations for 200 cases                                              |
| `src/hooks/useAnalyticsTracking.ts`                      | E     | Wire PostHog capture()                                                         |
| `src/lib/services/featureFlagService.ts`                 | E     | Replace in-memory flagCache Map with cacheService (L1+L2, TTL 5 min)           |
| `src/lib/utils/api-helpers.ts`                           | E     | Cache resume document reads (15 min TTL, cache-aside with collection tracking) |
| `src/lib/services/resume/resumeCrud.ts`                  | E     | Invalidate resume cache on updateResume and deleteResume                       |
| `src/app/api/resume/generate/route.ts`                   | E     | Add per-user hard cap (10 gen/hr via RESUME_GENERATION_HARD_CAP)               |
| `src/lib/config/rateLimits.ts`                           | E     | Add RESUME_GENERATION_HARD_CAP constant (10/hr)                                |
| `scripts/quality-check.sh`                               | C     | Add generation quality KPI                                                     |

---

## Is This Everything? Completeness Checklist

| Question                              | Answer                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| Does extraction scale beyond regex?   | ✅ Phase B — AI structured extraction                                              |
| Does generation guarantee valid JSON? | ✅ Phase A — Gemini structured output                                              |
| Is generation quality validated?      | ✅ Phase C — generation quality KPI gate                                           |
| Is the gold dataset sufficient?       | ✅ Phase D — 200 cases                                                             |
| Are production errors monitored?      | ✅ Phase E — Sentry + PostHog                                                      |
| Is cost tracked and enforced?         | ✅ Phase E — costControlService ($30/$70 caps, sharded counters)                   |
| Is abuse prevented?                   | ✅ Phase E — per-user rate limiting (10 gen/hr hard cap)                           |
| Is caching reducing Firestore costs?  | ✅ Phase E — cacheService wired (flags 5 min TTL, resumes 15 min TTL)              |
| Is there a pre-deploy quality check?  | ✅ Phase F — `scripts/eval-generation-quality.js` (10 gold cases, exits 0/1, <60s) |
| Are pipeline errors observable?       | ✅ Phase E — Sentry breadcrumbs at 7 orchestrator checkpoints                      |
| Is the orchestrator tested?           | ✅ Phase C — single-pass branches; Phase G — 4-agent revision loop (16 tests)      |
| Is the revision loop tested?          | ✅ Phase G — 36 tests: revision loop, gateway checks, cost tracking, 2-agent path  |
| Are AuditorAgent/WritingAgent tested? | ✅ Phase G — 20 unit tests across both agents (buildPrompt, parse, errors)         |
| What about templates?                 | 11 exist. Not a quality blocker.                                                   |
| What about vector search?             | Deferred — search feature, not generation quality                                  |
| What about international/RTL?         | Deferred — post-launch i18n                                                        |
| What about scanned PDF OCR?           | Deferred — rare edge case                                                          |

**Verdict**: This plan covers all known quality gaps for the resume generation pipeline. Nothing critical is deferred.
