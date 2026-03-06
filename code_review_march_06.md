# Code Review — March 6, 2026

**Date:** March 6, 2026  
**Scope:** Repository-wide review across app routes, UI, services, tests, and dependency posture  
**Baseline references:** [code_review_march_2nd.md](code_review_march_2nd.md), [code_review_feb_17_v1.md](code_review_feb_17_v1.md)

---

## Executive Summary

| Category                         | Status              | Notes                                                                         |
| -------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| TypeScript / lint quick gate     | ✅ PASS             | `npm run quality:quick` passed on Mar 6                                       |
| API route audit                  | ✅ STRONG           | 0 critical, 0 high, 3 medium findings                                         |
| Dependency audit                 | ✅ PASS / ⚠️ WATCH  | `npm audit --json` reports 0 vulns; DOMPurify advisory still needs monitoring |
| Tests                            | ⚠️ PARTIAL          | 1 active failing test contract mismatch; 22 skipped tests remain              |
| Accessibility                    | ⚠️ MINOR REGRESSION | 3 medium UI a11y issues in recruiter analytics/dashboard views                |
| Security architecture            | 🟢 GOOD             | Auth-first and route compliance are materially better than February           |
| Rate limiting / abuse prevention | ⚠️ STILL INCOMPLETE | In-memory limiting remains in edge middleware                                 |
| Billing / quota architecture     | ⚠️ STILL FRAGMENTED | Billing logic still duplicated across app and functions                       |
| Resume/JD ingestion              | 🟢 IMPROVED         | Live JD upload parsing exists, but stale placeholder code remains             |
| Maintainability                  | ⚠️ TECH DEBT        | Two core AI/resume services exceed 500-line budget                            |

### Bottom line

Compared with the March 2 baseline, the codebase is in a **better operational state**: quick quality checks are green, API audits are clean at critical/high severity, and the previously reported JD upload gap is fixed in the live flow. The main remaining risks are now **correctness drift and maintainability debt**, not systemic breakage.

The most important current follow-ups are:

1. Fix the single failing test in [src/lib/services/aiGenerationService.test.ts](src/lib/services/aiGenerationService.test.ts).
2. Clear the 3 medium accessibility findings in [src/components/analytics/RecruiterAnalyticsView.tsx](src/components/analytics/RecruiterAnalyticsView.tsx), [src/components/dashboard/recruiter/QuickActionsGrid.tsx](src/components/dashboard/recruiter/QuickActionsGrid.tsx), and [src/components/dashboard/recruiter/WelcomeBanner.tsx](src/components/dashboard/recruiter/WelcomeBanner.tsx).
3. Plan migration away from in-memory abuse controls in [src/middleware.ts](src/middleware.ts).
4. Consolidate billing behavior across [src/lib/services/billingService.ts](src/lib/services/billingService.ts), [functions/src/services/billingService.ts](functions/src/services/billingService.ts), and [functions/src/billingService.ts](functions/src/billingService.ts).

---

## What I Verified This Review

### Commands / signals checked

- `npm run quality:quick` → passed
- `node scripts/audit-api-routes.js` → 0 critical / 0 high / 3 medium
- `npm audit --json` → 0 vulnerabilities currently reported by npm
- `npm ls dompurify` → DOMPurify 3.3.2 present transitively through `posthog-js` and `swagger-ui-react`
- Workspace problems / test failure signal → 1 active failure in [src/lib/services/aiGenerationService.test.ts](src/lib/services/aiGenerationService.test.ts)
- Skipped test count via ripgrep → 22 skipped tests

### Documents compared

- [code_review_march_2nd.md](code_review_march_2nd.md)
- [code_review_feb_17_v1.md](code_review_feb_17_v1.md)
- [package.json](package.json)

---

## Confirmed Improvements Since Prior Reviews

### 1. Quick quality gate is green

The current quick gate reports:

- no TypeScript errors
- no critical ESLint errors
- only two max-lines budget violations

Primary debt is concentrated in:

- [src/lib/services/resumeGenerationOrchestrator.ts](src/lib/services/resumeGenerationOrchestrator.ts) — 699 lines
- [src/lib/services/resumeGenerationQuality.ts](src/lib/services/resumeGenerationQuality.ts) — 657 lines

This is materially better than the February reviews, where test/lint noise and broader regressions were more prominent.

### 2. API route posture is substantially improved

The latest route audit reports **0 critical** and **0 high** issues. That is the biggest repo-wide quality improvement versus the earlier February baselines.

This supports the conclusion that auth-first ordering, route authentication coverage, and generalized validation discipline have improved meaningfully across [src/app/api](src/app/api).

### 3. JD upload is fixed in the live path

Earlier reviews flagged JD parsing as incomplete. The current live flow now uses:

- [src/components/recruiter/JDUpload.tsx](src/components/recruiter/JDUpload.tsx) to upload the file
- [src/app/api/utils/parse-jd/route.ts](src/app/api/utils/parse-jd/route.ts) for authenticated server-side parsing
- [src/lib/services/documentParser.ts](src/lib/services/documentParser.ts) for PDF/DOCX/TXT extraction

So the production-facing JD upload blocker from February is no longer accurate.

---

## Current Open Issues

## P1 — High Priority

### 1. One active test failure caused by contract drift

**Evidence:**

- Implementation call site: [src/lib/services/aiGenerationService.ts](src/lib/services/aiGenerationService.ts#L70)
- Failing expectation: [src/lib/services/aiGenerationService.test.ts](src/lib/services/aiGenerationService.test.ts#L80)

**What changed**

`generateText()` now forwards a fifth `structuredOutput` argument to `generateWithGemini()`, but the test still asserts the older four-argument signature.

**Assessment**

- This appears to be **test maintenance drift**, not a production-path defect.
- It still matters because it keeps the suite from being truly green and weakens trust in CI status.

**Recommendation**

Update the affected test expectation to match the provider contract now implemented in [src/lib/services/aiGenerationService.ts](src/lib/services/aiGenerationService.ts).

---

### 2. Accessibility audit still has 3 medium issues

**Evidence from current audit**

1. Spinner missing `role="status"` / `aria-live` in [src/components/analytics/RecruiterAnalyticsView.tsx](src/components/analytics/RecruiterAnalyticsView.tsx)
2. Decorative inline SVG missing `aria-hidden="true"` in [src/components/dashboard/recruiter/QuickActionsGrid.tsx](src/components/dashboard/recruiter/QuickActionsGrid.tsx)
3. Decorative inline SVG missing `aria-hidden="true"` in [src/components/dashboard/recruiter/WelcomeBanner.tsx](src/components/dashboard/recruiter/WelcomeBanner.tsx)

**Assessment**

These are small fixes, but they are directly against the repo’s own accessibility rules and should not linger because they are low-cost to correct.

**Recommendation**

Fix these in the next patch and keep the audit at zero medium findings for UI/a11y where possible.

---

### 3. Rate limiting remains instance-local

**Evidence:** [src/middleware.ts](src/middleware.ts#L58)

The edge middleware still uses an in-memory `Map` for rate limiting. This is acceptable only as a temporary abuse control, not as a durable production mechanism across multiple instances/regions.

**Why it matters**

- limits can be bypassed across instances
- behavior can differ by region
- it does not provide a true global throttle for expensive AI endpoints

**Assessment**

This is still one of the most important unresolved architecture issues from prior reviews. It did not regress, but it also did not get closed.

**Recommendation**

Move rate limiting to a distributed store before traffic scale-up.

---

### 4. Billing logic still exists in multiple locations with drift risk

**Evidence:**

- Web app service: [src/lib/services/billingService.ts](src/lib/services/billingService.ts)
- Cloud Functions service replica: [functions/src/services/billingService.ts](functions/src/services/billingService.ts)
- Aggregation entrypoint: [functions/src/billingService.ts](functions/src/billingService.ts)

**Why this still matters**

Although shared billing constants exist, business behavior is not completely centralized. For example, billing-related writes and logging behavior differ between the app and functions variants.

**Risk**

- future quota logic drift
- inconsistent write semantics
- harder incident analysis during spend anomalies

**Recommendation**

Collapse to one authoritative billing behavior layer or make the split explicit with very narrow responsibilities.

---

## P2 — Medium Priority

### 5. Stale JD parser helper conflicts with the live implementation

**Evidence:**

- Placeholder helper: [src/lib/services/jdParserService.ts](src/lib/services/jdParserService.ts#L435-L454)
- Live upload caller: [src/components/recruiter/JDUpload.tsx](src/components/recruiter/JDUpload.tsx#L130-L137)
- Live route: [src/app/api/utils/parse-jd/route.ts](src/app/api/utils/parse-jd/route.ts)

The standalone helper in [src/lib/services/jdParserService.ts](src/lib/services/jdParserService.ts#L435-L454) still throws “paste the JD text instead” for PDF/DOCX, even though the real upload flow already supports authenticated server-side parsing.

**Assessment**

This is now a **stale code / misleading abstraction** issue, not a live user-facing blocker.

**Recommendation**

Delete, replace, or clearly deprecate the stale helper so future contributors do not reintroduce the old limitation by mistake.

---

### 6. Skipped test debt remains non-trivial

Current scan found **22 skipped tests**.

Representative hotspots:

- [src/**tests**/lib/services/aiGenerationService.test.ts](src/__tests__/lib/services/aiGenerationService.test.ts)
- [src/**tests**/lib/utils/retry.test.ts](src/__tests__/lib/utils/retry.test.ts)
- [src/**tests**/security-rules.test.ts](src/__tests__/security-rules.test.ts)
- [src/**tests**/firestore/security-rules.test.ts](src/__tests__/firestore/security-rules.test.ts)

**Assessment**

This is no longer catastrophic, but it is meaningful test coverage debt. The biggest concern is that security-rules suites are still explicitly skipped.

**Recommendation**

Prioritize unskipping security-rules coverage first, then provider-edge-case tests.

---

### 7. Core resume/AI services are still oversized

**Evidence:**

- [src/lib/services/resumeGenerationOrchestrator.ts](src/lib/services/resumeGenerationOrchestrator.ts)
- [src/lib/services/resumeGenerationQuality.ts](src/lib/services/resumeGenerationQuality.ts)

These files remain over the repo’s 500-line budget.

**Assessment**

This is maintainability debt more than immediate risk, but it increases the chance of regressions in prompt handling, data shaping, and test coverage.

**Recommendation**

Split by responsibility:

- orchestration / queueing
- schema normalization
- quality scoring / validation
- provider interaction / retries

---

## Dependency & Security Watchlist

### DOMPurify advisory email — current assessment

**What I verified**

- [package.json](package.json) pins `dompurify` to `3.3.2` via `overrides`
- `npm ls dompurify` shows it is pulled in by `posthog-js` and `swagger-ui-react`
- `npm audit --json` currently reports **0 vulnerabilities**
- A search of application source found **no active `dangerouslySetInnerHTML` usage in `src/**`\*\*

**Interpretation**

The email alert is likely coming from an advisory data source that has not yet produced an npm remediation path. That matches the “no remediation available yet” message.

**Risk framing**

- This is a **real dependency watch item**.
- It is **not currently showing as an actionable npm audit failure**.
- Because the app does not appear to rely on direct HTML injection paths in `src/**`, exploitability in current app code is likely lower than the email alone suggests.

**Action plan**

1. Keep the alert open as a watch item.
2. Upgrade immediately when a patched DOMPurify release or upstream package bump is published.
3. Avoid introducing HTML rendering paths until the advisory is resolved.
4. Re-run `npm audit` and `npm ls dompurify` after the next dependency refresh.

---

## March 6 Risk Ranking

| Rank | Issue                                  | Severity | Why                                                          |
| ---- | -------------------------------------- | -------- | ------------------------------------------------------------ |
| 1    | In-memory rate limiting in middleware  | High     | Production abuse control is still instance-local             |
| 2    | Billing logic duplication              | High     | Drift risk around spend enforcement remains                  |
| 3    | Failing AI generation test             | High     | CI trust issue; easy to fix                                  |
| 4    | 3 accessibility regressions            | Medium   | Direct standards violations, low effort to fix               |
| 5    | 22 skipped tests                       | Medium   | Coverage credibility gap, especially security rules          |
| 6    | Stale JD parser helper                 | Medium   | Misleading code path may cause future regressions            |
| 7    | Oversized resume/AI service files      | Medium   | Maintainability and review complexity debt                   |
| 8    | DOMPurify advisory with no remediation | Watch    | External dependency issue; monitor until upstream fix exists |

---

## Recommended Next Actions

### Next 24 hours

1. Fix [src/lib/services/aiGenerationService.test.ts](src/lib/services/aiGenerationService.test.ts).
2. Fix the 3 current accessibility findings.
3. Remove or deprecate [src/lib/services/jdParserService.ts](src/lib/services/jdParserService.ts#L435-L454).
4. Record the DOMPurify email in dependency tracking and monitor upstream releases.

### Next sprint

1. Move middleware rate limiting to a distributed backend.
2. Consolidate billing service behavior.
3. Unskip security-rules tests and reduce total skipped tests.
4. Split oversized resume-generation service files.

---

## Final Assessment

This repository is **not stuck** and it is **not in the same state as the older February reviews**. The current codebase is materially healthier:

- quality quick-check passes
- npm audit is currently clean
- API route audit has no critical/high findings
- the earlier JD upload blocker is fixed in the live path

The remaining work is mostly **cleanup of residual debt and architecture hardening**, with one small test regression and a DOMPurify advisory to monitor.

In short: **shipping posture is improved, but not yet fully “clean-room” production ready until the abuse controls, billing consolidation, and test debt are tightened.**
