# Security Findings v1

Date: April 1, 2026
Repository: `Switch_cv_Nov_21`
Reviewer: Codex static review + `npm audit --omit=dev`

## Remediation Status

| #   | Finding                                 | Severity          | Status                                                                                                                                                                                           | Date Fixed    |
| --- | --------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| 1   | Hardcoded Gemini API key                | High              | **FIXED** — Key removed from source, loaded from env var. **ACTION NEEDED: Rotate key in Google Cloud Console.**                                                                                 | April 1, 2026 |
| 2   | Private resume metadata in `allResumes` | High              | **FIXED** — Fan-out now only writes public/published resumes. userId removed from global payload. Firestore rules enforce visibility+published check.                                            | April 1, 2026 |
| 3   | Recruiter-wide analytics access         | Medium-High       | **FIXED** — Firestore rules updated: analytics readable by owner+admin only. Recruiter blanket access removed from all subcollections.                                                           | April 1, 2026 |
| 4   | Anonymous analytics poisoning           | Medium            | **FIXED** — POST /api/profiles/analytics now requires authentication when userId is present. Anonymous callers cannot supply forged userId.                                                      | April 1, 2026 |
| 5   | State-changing GET for approve/decline  | Medium            | **FIXED** — GET now shows confirmation page only. Actual mutation moved to POST handler with form submission.                                                                                    | April 1, 2026 |
| 6   | Health endpoint quota abuse             | Medium-Low        | **FIXED** — Removed /api/health from rate-limit exempt list. Added 30s response caching to prevent repeated Firestore/Gemini calls.                                                              | April 1, 2026 |
| 7   | Dependency vulnerabilities (5 total)    | High/Moderate/Low | **FIXED** — node-forge, @xmldom/xmldom, picomatch patched via npm audit fix. nodemailer upgraded to 8.x. brace-expansion override applied. `npm audit --omit=dev` now reports 0 vulnerabilities. | April 1, 2026 |

## Scope

This report documents the findings from a source review of the Next.js app, Firebase Functions, Firestore/Storage rules, and the production dependency tree.

What was reviewed:

- Application routes under `src/app/api`
- Firebase/Firestore security rules
- Firebase Functions fan-out and access control logic
- Secret handling patterns
- Production dependency advisories from `npm audit --omit=dev`

What was not done:

- No live exploitation or destructive testing
- No cloud console inspection
- No runtime traffic interception

## Executive Summary

Confirmed application/security issues:

1. High: hardcoded Gemini API key committed to the repository
2. High: private resume metadata exposed through `allResumes` fan-out + permissive Firestore reads
3. Medium-High: recruiter-wide access to other users' analytics via Firestore rules
4. Medium: anonymous analytics poisoning through `/api/profiles/analytics`
5. Medium: state-changing approval/decline flows implemented as public `GET` routes
6. Medium-Low: public health endpoint can be abused for backend quota/cost amplification

Dependency audit summary on April 1, 2026:

- 5 production vulnerabilities reported
- 3 high
- 1 moderate
- 1 low

## Findings

### 1. Hardcoded Gemini API key committed to the repository

Severity: High
Confidence: High

Evidence:

- `scripts/test-new-models.js:9`
- `scripts/test-new-models.js:25`

Details:

The script contains a literal Google/Gemini API key and uses it directly in outbound requests. Anyone with repository access can reuse the key, burn quota, or pivot into other abuse depending on the key's permissions and restrictions.

Impact:

- Unauthorized API usage
- Quota exhaustion
- Cost exposure
- Secret reuse risk if the same key is used elsewhere

Recommended remediation:

- Revoke and rotate the exposed key immediately
- Remove the hardcoded secret from source control
- Load the key from Secret Manager or environment variables only
- Add a repo-wide secret scanning gate in CI

---

### 2. Private resume metadata exposed through `allResumes`

Severity: High
Confidence: High

Evidence:

- `functions/src/resumeFanoutService.ts:69`
- `functions/src/resumeFanoutService.ts:141`
- `functions/src/resumeFanoutService.ts:174`
- `firestore.rules:463`

Details:

Every resume is fanned out into `allResumes` regardless of whether it is public. Firestore rules then allow any authenticated recruiter or admin to read the entire `allResumes` collection directly.

The fanned-out payload includes:

- `userId`
- `numericId`
- `title`
- `visibility`
- `published`
- `status`
- timestamps

This bypasses the tighter privacy check already present on the canonical `/resumes` collection, where recruiter reads require `isPublic == true` and `isBeingEdited == false`.

Impact:

- Recruiters can enumerate private resume metadata
- Internal identifiers can be harvested
- Privacy controls become inconsistent across collections

Recommended remediation:

- Only fan out public/searchable resumes into `allResumes`
- Or enforce the same visibility predicates in the `allResumes` rule set
- Remove `userId` and other unnecessary internal fields from recruiter-readable fan-out documents
- Add tests that verify private resumes never appear in recruiter-readable collections

---

### 3. Recruiter-wide access to unrelated analytics via Firestore rules

Severity: Medium-High
Confidence: High

Evidence:

- `firestore.rules:302`
- `firestore.rules:321`
- `firestore.rules:327`

Details:

The analytics rules allow any authenticated recruiter to read analytics documents and subcollections for other users, not just resources they own or have been granted access to. This includes engagement, request, and view-related analytics.

Impact:

- Cross-tenant analytics exposure
- Candidate behavioral data leakage
- Potential intelligence gathering on recruiter/candidate activity

Recommended remediation:

- Restrict analytics reads to owners and admins by default
- If recruiter access is required, gate it on an explicit grant tied to the target resume/profile
- Add rules tests covering unrelated recruiter access attempts

---

### 4. Anonymous analytics poisoning in `/api/profiles/analytics`

Severity: Medium
Confidence: High

Evidence:

- `src/app/api/profiles/analytics/route.ts:118`
- `src/app/api/profiles/analytics/route.ts:145`
- `src/app/api/profiles/analytics/route.ts:175`
- `src/lib/services/analytics/tracking.ts:21`

Details:

`POST /api/profiles/analytics` allows anonymous callers. The route only rejects a mismatched `userId` when the caller is authenticated. If the caller is anonymous, a forged `userId` is accepted, stored into analytics events, and used to increment recruiter metrics.

This means an unauthenticated client can impersonate arbitrary recruiter activity in analytics and metrics.

Impact:

- Polluted analytics data
- False recruiter activity metrics
- Potential abuse of internal dashboards or rate/usage decisions driven by metrics

Recommended remediation:

- If `userId` is present, require authentication and enforce equality with the authenticated user
- Ignore client-supplied `userId` and derive actor identity only from auth context
- Separate anonymous public tracking from authenticated recruiter tracking
- Add tests for anonymous payloads containing `userId`

---

### 5. Approval and decline actions are state-changing public `GET` endpoints

Severity: Medium
Confidence: Medium-High

Evidence:

- `src/app/api/user-approval/approve/route.ts:207`
- `src/app/api/user-approval/approve/route.ts:385`
- `src/app/api/user-approval/decline/route.ts:18`
- `src/app/api/user-approval/decline/route.ts:181`

Details:

The approval and decline flows are public tokenized links that mutate state on `GET`. This is risky because email scanners, safe-link systems, bots, or preview services frequently prefetch `GET` links. In that model, a passive scan can unintentionally approve or decline a user before a human reviewer acts.

This is a confirmed design weakness. The exact exploitability depends on the mail gateway and client behavior in production.

Impact:

- Unintended approval or decline of accounts
- One-time token consumption by automated link scanners
- Audit ambiguity over who actually performed the action

Recommended remediation:

- Convert the mutation step to `POST`
- Use `GET` only for a confirmation page
- Require an explicit form/button submission for the final state change
- Bind approval tokens to one human confirmation step

---

### 6. Public health endpoint can be abused for backend quota/cost amplification

Severity: Medium-Low
Confidence: High

Evidence:

- `src/middleware.ts:45`
- `src/app/api/health/route.ts:39`
- `src/app/api/health/route.ts:56`

Details:

`/api/health` is exempted from middleware rate limiting, but each request still performs Firestore access and a Gemini models API check. Repeated unauthenticated requests can therefore force backend work, consume API quota, and increase cost.

Impact:

- Avoidable backend load
- Gemini quota/cost burn
- External probing of dependency health

Recommended remediation:

- Rate limit `/api/health`
- Split cheap liveness from expensive dependency readiness checks
- Cache the expensive readiness result briefly
- Restrict deep health checks to internal/admin callers

## Dependency Audit

Command run:

```bash
npm audit --omit=dev --json
```

Result summary:

- Total production advisories: 5
- High: 3
- Moderate: 1
- Low: 1

### Reported production advisories

#### `node-forge`

Severity: High

Evidence:

- `package.json:67`
- `package-lock.json:15555`

Observed version:

- `node-forge@1.3.3` via `firebase-admin`

Notes:

`npm audit` reported multiple high-severity advisories affecting versions below `1.4.0` or `<=1.3.3`. This is currently transitive, so remediation may require a `firebase-admin` upgrade or an override once compatibility is confirmed.

#### `@xmldom/xmldom`

Severity: High

Evidence:

- `package.json:69`
- `package-lock.json:21098`

Observed version:

- `@xmldom/xmldom@0.8.11` via `mammoth`

Notes:

`npm audit` reported an XML injection advisory affecting versions below `0.8.12`.

#### `picomatch`

Severity: High / Moderate

Evidence:

- `package-lock.json:6211`

Observed versions:

- `picomatch@4.0.3`
- `picomatch@2.3.1` also present transitively

Notes:

The audit reported method-injection and ReDoS advisories affecting vulnerable `2.x` and early `4.x` versions. This is transitive.

#### `brace-expansion`

Severity: Moderate

Evidence:

- `package-lock.json:1480`

Observed version:

- `brace-expansion@1.1.12`

Notes:

The audit reported a process hang / memory exhaustion issue for versions below `1.1.13`.

#### `nodemailer`

Severity: Low

Evidence:

- `package.json:75`
- `package-lock.json:22182`

Observed version:

- `nodemailer@7.0.13`

Notes:

The audit reported an SMTP command injection advisory for versions below `8.0.4`. Since this is a direct dependency, this one is straightforward to track and upgrade, but the practical impact depends on whether unsafe `envelope.size` values are ever user-controlled in this app.

## Prioritized Remediation Order

1. Revoke and rotate the exposed Gemini API key
2. Fix `allResumes` exposure so private resumes are never recruiter-readable
3. Lock down analytics Firestore rules to owners/admins or explicit grants
4. Require authenticated identity for recruiter-linked analytics writes
5. Convert approval/decline flows from state-changing `GET` to explicit `POST`
6. Patch or override vulnerable production dependencies where safe
7. Rate limit or internalize the expensive health check

## Suggested Follow-Up Work

- Add Firestore rules tests for recruiter isolation and private resume visibility
- Add automated secret scanning in CI
- Add endpoint-level abuse tests for public routes
- Re-run `npm audit` after dependency updates and document residual advisories
