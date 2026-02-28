# Public Launch Recovery Plan: High-Quality Resume Intelligence + Premium Templates

## Summary

This plan replaces the current fragile regex-first creation flow with a structured, evidence-backed pipeline that can reliably convert chat, pasted text, and PDF/DOCX into meaningful resumes.  
It is a phased rollout with strict quality gates, parallel template redesign, and launch blocking KPIs.

Chosen strategy and constraints:

- Delivery: `Phased Recovery`
- Launch gate: `Strict`
- Input scope: `Chat + Paste + PDF/DOCX`
- Generation architecture: `Structured Single-Writer + Validators`
- Creativity policy: `Evidence-Backed Creative`
- Privacy policy: `Ephemeral Processing`
- Template goal: `1 polished template at launch + 2 post-launch` (scope reduced to protect quality gate)
- KPI gate: `High Quality KPI`

## Implementation Update (February 28, 2026)

### Completed in code

- [x] `documentParser.ts` migrated to `pdf-parse` v2 `PDFParse` class API with parser cleanup.
- [x] `resumeDataExtractor.ts` now extracts values from **user-authored messages only**; assistant messages are context/completion signals only.
- [x] Hardening fixes implemented:
  - [x] `ContactExtractor.ts`: blocks role-phrase false name captures like `I am the solo founder...`.
  - [x] `SkillsExtractor.ts`: boundary-based matching only (no substring inference such as `digital -> Git`, `guardrails -> Rails`).
  - [x] `ExperienceExtractor.ts`: removed generic filler description insertion.
  - [x] `EducationExtractor.ts`: no default-to-current-year; missing year remains empty.
- [x] Centralized feature-flag evaluation added in `resumeGenerationOrchestrator.ts` for:
  - [x] `resume_v2_intake`
  - [x] `resume_v2_writer`
  - [x] `resume_v2_templates`
  - [x] `resume_v2_strict_validation`
- [x] Strict validation flow added before persistence:
  - [x] Enforces required structure (`name`, `email`, `summary`, at least one of `experience/education`, non-empty `skills`) when strict mode is enabled.
  - [x] On failure, returns structured clarification response (`needsClarification`, `missingEvidenceFields`) and skips persistence.
- [x] Validation-repair loop (single repair pass) added:
  - [x] Failed candidate validation triggers one constrained model repair attempt with explicit validation errors.
  - [x] Persistence still blocked if repaired output remains invalid.
- [x] Single-writer schema contract hardening + broader factual validator coverage completed:
  - [x] Added deterministic contract validation for writer payloads (`name/email/summary`, skills shape, and entry-level checks for experience/education).
  - [x] Expanded factual alignment checks from summary metrics only to include experience bullets, scope claims, and non-numeric assertions.
  - [x] Repair pass trigger now uses the full validator set (base structure + contract + factual errors), then re-validates before persistence.
- [x] Persistence metadata added in `resumeCrud.ts`:
  - [x] `qualityReport`
  - [x] `evidenceMap`
  - [x] `generationVersion` (with `pipeline`)
- [x] Request schema updated for `/api/resume/generate` with additive fields:
  - [x] `inputSources`
  - [x] `desiredStyle`
  - [x] `strictMode`
- [x] New intake normalization capability delivered:
  - [x] `ResumeIntakeNormalizer` service for deterministic cleaning, section segmentation, and evidence map generation.
  - [x] New authenticated route: `POST /api/resume/intake/normalize`.
- [x] Preview generation capability delivered:
  - [x] New authenticated route: `POST /api/resume/generate/preview`.
  - [x] Orchestrator now supports `persistResult: false` for non-persisted preview generation.
- [x] Additional hardening completed for leftover edge cases:
  - [x] `resumeGenerationOrchestrator.ts` now safely falls back when extraction fails/returns empty, instead of crashing the flow.
  - [x] `resumeGenerationQuality.ts` now evaluates summary metric claims against user-authored evidence and feeds that score into `qualityReport`.
  - [x] Strict mode now blocks persistence when summary metric claims are unverified by evidence.
  - [x] Feature-flag evaluation has safe defaults if runtime flag resolution fails unexpectedly.
- [x] API documentation alignment completed:
  - [x] Added dedicated OpenAPI schemas for resume generation request/response, preview request, intake normalize request/response, and quality report fields.
  - [x] Updated resume path docs to reference the new schemas for `/api/resume/generate`, `/api/resume/generate/preview`, and `/api/resume/intake/normalize`.
- [x] Targeted tests added/updated and passing:
  - [x] `resumeDataExtractor`
  - [x] `conversationManager`
  - [x] `documentParser`
  - [x] `resumeService` (metadata persistence)
  - [x] `resumeIntakeNormalizer`
  - [x] `resumeGenerationQuality`
  - [x] `/api/resume/intake/normalize` route
  - [x] `/api/resume/generate/preview` route

### Still pending (post this patch)

- [x] Creative polisher stage and Phase 3 gate harness
  - `resumeCreativePolisher.ts` (283 lines) — evidence-backed rewriting with confidence annotation and automatic revert for low-confidence statements.
  - Integrated in `resumeGenerationOrchestrator.ts` behind `resume_v2_creative_polish` feature flag.
  - Validation re-check after polish; falls back to factual baseline if polished output fails.
  - Style profiles: `professional`, `executive`, `innovator`.
  - Tests passing (resumeCreativePolisher.test.ts).
- [x] Phase 4 launch template build-out (`Signal`) and post-launch templates
  - `signal-v1` template implemented in `src/lib/templates/resumeTemplates/signal-v1.ts`.
  - Registered in `resumeTemplates.ts` and renderable via `TemplateRenderer.tsx`.
  - Test coverage in `TemplateRenderer.test.tsx` ("renders the signal template").
  - Post-launch templates (`Narrative`, `Studio`) remain future work.
- [x] Phase 5 offline evaluation harness + rollout KPI automation
  - `resumeEvaluationHarness.ts` (219 lines) — `evaluateLaunchGate()` and `evaluateCreativePolishGate()` functions.
  - Launch-blocking KPI thresholds enforced: `>=95%` parse/schema valid, `>=90%` factual alignment, `>=4.5` reviewer score.
  - Creative polish gate: zero fabricated claims, reviewer `>=4.5`, no regeneration increase.
  - Tests passing (resumeEvaluationHarness.test.ts).

## Phase 0: Immediate Stabilization (1-2 days)

1. Add protective kill-switches and feature flags.
2. Default production traffic to safest mode if structured validation fails.
3. Block known-bad behaviors immediately:

- No fallback placeholder experience descriptions.
- No auto-year defaults for education.
- No substring skill inference from arbitrary words.

Deliverables:

- Flags: `resume_v2_intake`, `resume_v2_writer`, `resume_v2_templates`, `resume_v2_strict_validation`.
- Emergency safe path for partial failures.
- **Flag evaluation site**: all flags are checked exclusively inside `resumeGenerationOrchestrator.ts`, not scattered across individual extractors. This prevents inconsistent gating across code paths.
- **Begin evaluation dataset collection now**: sourcing and anonymizing the 200-case gold dataset (see Phase 5) must start in Phase 0. It is the critical path blocker for the launch gate; waiting until Week 4 turns the KPI check into a rubber stamp.

## Phase 1: Intake and Normalization Foundation (Week 1)

1. Replace brittle extraction as primary source with a normalized intake pipeline.
2. Keep regex extractors as optional fallback only, never source-of-truth.
3. Fix document parsing implementation compatibility with current `pdf-parse` v2 API.

Implementation details:

- Update [documentParser.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/documentParser.ts) to use `PDFParse` class API.
- Add `ResumeIntakeNormalizer` service:
- Input channels: chat turns, pasted text, PDF text, DOCX text.
- Section segmentation by headings and positional heuristics.
- Deterministic cleaning: remove OCR artifacts, duplicated headers/footers, broken line wraps.
- Evidence tracking for each extracted field.
- Update [resumeDataExtractor.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/resumeDataExtractor.ts):
- Parse only user-authored content for extraction.
- Assistant messages allowed only for context, not value extraction.
- Remove over-broad context contamination.
- Harden field parsers:
- [ContactExtractor.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/extractors/ContactExtractor.ts): prevent `I am ...` job phrases from being treated as name.
- [SkillsExtractor.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/extractors/SkillsExtractor.ts): exact/boundary skill matching only; no substring hits like `digital -> Git` or `guardrails -> Rails`.
- [ExperienceExtractor.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/extractors/ExperienceExtractor.ts): remove generic filler description insertion.
- [EducationExtractor.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/extractors/EducationExtractor.ts): never default year to current year; use `null`/empty and ask for clarification.

## Phase 2: Structured Generation + Validation Pipeline (Week 2)

1. Move `/api/resume/generate` creation to structured writer with deterministic validators.
2. Treat LLM output as candidate data, not final truth.
3. Add validation-repair loop before persistence.

Implementation details:

- Refactor [resumeGenerationOrchestrator.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/resumeGenerationOrchestrator.ts):
- Step A: intake normalized draft + evidence map.
- Step B: single-writer model produces strict JSON schema only.
- Step C: validator suite checks schema, factual alignment, formatting quality.
- Step D: if failed, one repair pass with explicit validation errors fed back to the model.
- Step E: if the repair pass also fails validation, do NOT persist. Return a structured `needsClarification` response to the caller with the specific missing or unresolvable fields. The user-facing experience must show a clear prompt to provide more information — never a generic error, never a silent partial save.
- Step F: persist only on full validation success.
- Add factual alignment checks:
- Every summary claim must map to evidence snippets.
- Metrics claims must exist in source or be omitted.
- Enforce strong required structure before creation:
- Name, email, summary, at least one of experience/education, and non-empty skill set.
- No resume persistence on soft/partial invalid states.
- Update [resumeCrud.ts](/Users/anilalapati/Development/Switch_cv_Nov_21/src/lib/services/resume/resumeCrud.ts):
- Persist `qualityReport`, `evidenceMap`, `generationVersion` metadata.
- Preserve backwards compatibility for existing readers.

## Phase 3: Creativity Layer (Evidence-Backed) (Week 3)

1. Add controlled “creative polish” after factual structure is finalized.
2. Creativity constrained by evidence references and policy.

Implementation details:

- Introduce `CreativePolisher` stage:
- Rewrites summary/bullets for impact and readability.
- Forbidden: fabricated numbers, invented scope, unverified claims.
- Style profiles:
- `professional`, `executive`, `innovator`.
- Add “confidence annotation” internally for each polished statement.
- If confidence low, revert to factual plain statement.
  **Phase 3 quality gate** (must pass before enabling CreativePolisher in production):
- Blind reviewer score `>=4.5/5` on polished vs. factual plain output across 50 representative resumes.
- Zero instances of fabricated metrics or unverified scope claims in reviewer sample.
- `avg_regeneration_attempts` does not increase compared to Phase 2 baseline.
- Gate is enforced in evaluation harness before the `resume_v2_creative_polish` flag is enabled for any traffic.

## Phase 4: Parallel UI/Template Track (Weeks 2-4)

1. Build **1 polished launch template** in parallel without blocking intelligence hardening. Remaining 2 templates are post-launch.
2. Templates consume normalized resume model only.
3. Rationale for scope reduction: delivering mobile-first, print-quality, AA-accessible, ATS-safe templates is substantial work. 3 templates in 3 weeks while the backend is being rebuilt risks shipping low-polish work that undermines the premium positioning. Better to ship 1 excellent template than 3 rushed ones.

Template set:

**Launch (Week 4):**

1. `Signal` (Engineering-first) — selected as launch template due to broadest applicability.

- Dense technical signals, impact-first bullets, stack clustering.
- Strong readability for recruiters scanning in 30 seconds.

**Post-launch (Weeks 5-8):** 2. `Narrative` (Leadership/Product)

- Career arc storytelling, outcomes and ownership emphasis.
- Visual hierarchy for achievements and scope.

3. `Studio` (Creative/Modern)

- Bold editorial layout with modular blocks and project spotlight.

Design system requirements:

- Mobile-first rendering and desktop parity.
- Print-to-PDF quality (single and multi-page handling).
- Accessibility: AA contrast, semantic headings, keyboard nav.
- No decorative layout that harms ATS text extraction.
- Shared token system for spacing/type/color and consistent section primitives.

## Phase 5: Evaluation, Gating, and Rollout (Week 4)

1. Build offline evaluation harness with fixed gold dataset.
2. Run strict KPI gate before public launch.
3. Progressive rollout with automatic rollback triggers.

Evaluation set:

- 200-case dataset:
- 80 chat-only
- 60 paste-heavy
- 60 PDF/DOCX imports
- Includes messy real-world resumes, mixed formats, non-US phone/location formats.

Launch-blocking KPI:

- `>=95%` schema-valid outputs
- `>=90%` factual alignment score
- Reviewer score `>=4.5/5` on clarity, relevance, impact

Rollout:

1. Internal dogfood 100% (2-3 days)
2. Private beta 5% of jobseeker traffic
3. Beta 25% after 72h stable metrics
4. 100% public launch after KPI + incident-free window

Rollback triggers:

- Factual alignment < 90%
- Schema validity < 95%
- Spike in user edits/rejections
- Parsing failure spike for uploads

## Public API, Interface, and Type Changes

Planned API evolution:

1. `POST /api/resume/generate` (primary create path)

- Request adds: `inputSources`, `desiredStyle`, `strictMode`.
- Response adds: `qualityReport`, `needsClarification`, `missingEvidenceFields`.

2. New `POST /api/resume/intake/normalize`

- Accepts chat/paste/file extracted text.
- Returns normalized structured draft + evidence map.

3. Optional `POST /api/resume/generate/preview`

- Generates non-persisted preview for UX iteration.

**Auth requirement (mandatory for all new endpoints):** Every new route MUST call `getAuthenticatedUserId()` as the first operation before any body parsing or LLM calls. Routes 2 and 3 involve LLM inference and are high-value abuse targets. No exceptions. See project Rule 1 and Rule 10.

Planned type additions:

- `NormalizedResumeDraft`
- `EvidenceMap`
- `GenerationQualityReport`
- `ValidationErrorDetail`
- `ResumeGenerationVersion` — must include a `pipeline` field (e.g. `v1_regex`, `v2_structured`, `v2_creative`) so any reader or support engineer can identify which generation path produced a stored document. This is required for the observability metrics and for safe rollback without corrupting existing resumes.

Backward compatibility:

- Existing resume readers remain compatible.
- New fields are additive and optional for old documents.

## Test Plan and Scenarios

Unit tests:

1. Name extraction does not capture role phrases (`I am the solo founder...`).
2. Skill parser rejects substring false positives (`digital`, `guardrails`).
3. Education parser never defaults year to current year.
4. Experience parser never inserts generic placeholder description.
5. PDF parser returns stable text using current `pdf-parse` API.

Integration tests:

1. Full chat flow produces valid resume with evidence map.
2. Paste-heavy input with mixed bullet/text formatting.
3. PDF import from real resume samples and known noisy layouts.
4. Validation-repair loop catches and corrects malformed JSON output.
5. Persistence blocked on failed quality checks.

E2E tests:

1. User creates resume from upload + additional chat details.
2. User receives clarification prompts for missing critical fields.
3. Template switching preserves content integrity across all 3 templates.
4. Mobile and print snapshots for all templates.

Regression suite:

- Replay known failure examples from this incident as permanent fixtures.

## Observability and Ops

1. Add metrics dashboards:

- `parse_success_rate` — alert if drops below 95%
- `schema_valid_rate` — alert if drops below 95% (launch-blocking threshold)
- `factual_alignment_score` — alert if drops below 90% (launch-blocking threshold)
- `avg_regeneration_attempts` — alert if exceeds 1.3 per resume (indicates systematic model or prompt failure)
- `user_manual_edit_rate` — alert if exceeds 40% (indicates output quality regression)

2. Structured logs with request trace IDs and generation version (pipeline field from `ResumeGenerationVersion`).
3. Daily quality report to internal channel with top failure clusters.

## Explicit Assumptions and Defaults

1. We keep existing endpoints live while introducing v2 path behind flags.
2. Multi-agent remains optional and non-primary for creation in v1 public launch.
3. Raw upload content is processed ephemerally; only normalized structured data + audit metadata are persisted.
4. Template work runs in parallel, but launch is blocked by intelligence KPI gate.
5. If timeline compresses, template scope is reduced before quality gate is reduced. This has already been applied: launch ships with 1 template (`Signal`); `Narrative` and `Studio` follow post-launch.
6. The 200-case evaluation dataset must be built incrementally starting Phase 0. It is not buildable in a single week and must not be treated as a Phase 5 task.
