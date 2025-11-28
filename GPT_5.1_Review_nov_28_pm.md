# GPT-5.1 Review — Nov 28 PM

## Findings

| ID  | Severity | Area                           | Summary                                                                                                                                                                      |
| --- | -------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Critical | Billing & Access Control       | `/api/user/profile` lets any authenticated user set `subscriptionTier` and role values directly, enabling free self-upgrades.                                                |
| 2   | Critical | Recruiter Contact Workflow     | `/api/recruiters/*` endpoints accept unauthenticated payloads and trust `recruiterId`/`adminUserId`, allowing arbitrary creation/approval of PII access tokens.              |
| 3   | High     | Candidate Directory Privacy    | `/api/profiles/search` is anonymous, uses the client SDK server-side, and can expose the full user base or simply fail under Firestore rules.                                |
| 4   | High     | Abuse Prevention               | `applyRateLimit` stores counters in-memory per process, so tiered endpoints (AI, recruiter search) are effectively unprotected once multiple instances run.                  |
| 5   | Medium   | Server ↔ Firestore Integration | Several API routes (`profiles/search`, `recruiters/*`, etc.) import the client `db` instead of the admin SDK, so they cannot satisfy Firestore security rules in production. |
| 6   | Medium   | Recruiter Search Performance   | Premium recruiter search scans up to 200 resumes per request in memory (`search-service.ts`), which will time out or cap results as data grows.                              |
| 7   | Medium   | Content Security Policy        | `next.config.ts` ships a CSP with `script-src 'unsafe-inline' 'unsafe-eval'`, negating the protections the rest of the policy tries to provide.                              |
| 8   | Low      | Observability                  | `reportError` always logs at `error` severity even for warnings/info, making SLO dashboards noisy and hiding real incidents.                                                 |

### Critical

**1. Self-service subscription escalation (`src/app/api/user/profile/route.ts`)**

- `POST` and `PUT` trust any `subscriptionTier` sent by the caller so long as `uid` matches the authenticated user. There is no server-side check against billing records or admin roles.
- Impact: a basic user can call the endpoint with `{ subscriptionTier: "enterprise" }` and immediately unlock unlimited AI/search credits; the same endpoint also persists `isRecruiter` and `companyName` values without vetting, so anyone can masquerade as a recruiter.
- Fix: ignore client-supplied tier/role fields unless the requester passes an admin authorization check; derive entitlement from Stripe/Firebase custom claims; move privileged updates behind an admin-only route.

**2. Recruiter contact workflow is unauthenticated (`src/app/api/recruiters/request-contact|approve-contact|deny-contact/route.ts`)**

- None of the recruiter routes call `getAuthenticatedUserId`. They simply parse JSON and trust `recruiterId`, `userId`, or even `adminUserId` from the payload.
- `request-contact` uses Firestore writes to `recruiterRequests` and `adminNotifications` without verifying the caller is the recruiter; `approve-contact` goes further, minting access tokens and sending notifications on behalf of any `adminUserId` string.
- Impact: An attacker can craft a POST to approve someone else’s pending request, obtain PII access tokens, or spam admin notifications. Even if Firestore rejects some writes today, the API offers no protection once the SDK is fixed.
- Fix: enforce bearer auth + role checks (admin vs recruiter) via `getAuthenticatedUserId` and `getUserRole`; never trust identifiers from the body; switch these routes to the admin SDK so rules aren’t relied upon for server logic.

### High

**3. Anonymous profile search with client SDK (`src/app/api/profiles/search/route.ts`)**

- The route never authenticates the caller yet allows arbitrarily complex queries over `users`.
- It imports `db` from the client Firebase bundle, so requests execute with no service credentials; to function it would require Firestore rules that grant public read access to user documents, which would leak every job seeker profile.
- Even if rules stay strict, the endpoint simply fails with `permission-denied`, meaning the recruiter UI cannot rely on it.
- Require a bearer token, wire in `adminDb`, and scope queries to the requester’s entitlements (tier, role, candidate visibility).

**4. Rate limiting not actually enforced in production (`src/lib/utils/rateLimit.ts`)**

- `applyRateLimit` stores counts in a module-level `Map`. Each Vercel/Cloud Run instance has its own map, so an attacker can spray requests across cold starts or regions and never hit the limit. Restarts also reset usage to zero.
- Endpoints that call `applyRateLimit` (profile search, recruiter search, AI model refresh) incur real Firestore/LLM costs and remain vulnerable to abuse.
- Adopt the existing Firestore-backed limiter used elsewhere (transactions) or Redis; minimally, document that these endpoints are unsafe to expose publicly until a distributed limiter is in place.

### Medium

**5. Server routes using the browser SDK (`profiles/search`, `recruiters/*`, `recruiters/verify-token`, etc.)**

- Importing `db` from `@/lib/firebase` makes Next.js bundle the browser SDK, which depends on window-specific globals and never carries admin credentials.
- Consequences:
  - Every Firestore call from these API routes fails under the default security rules (because `request.auth == null`).
  - The bundle size for API routes explodes, hurting cold start times.
- Replace all server routes with the admin SDK (`adminDb`). Authorization should be enforced in code, not via relaxed Firestore rules.

**6. Premium recruiter search performs linear scans (`src/app/api/recruiter/search-resumes/search-service.ts`)**

- `performPremiumSearch` loads up to 200 published resumes, iterates them in JavaScript, and performs substring checks on every skills/location list. There are no indexes, no pagination, and a hard cap of 50 results.
- With a few thousand resumes this will time out or silently drop matches beyond the first 200 docs, making search correctness depend on document order.
- Consider moving search to Firestore composite/array-contains queries, Cloud Functions leveraging vector search, or BigQuery/Algolia/Vertex, and always paginate via query cursors instead of arbitrary truncation.

**7. CSP weakens XSS protections (`next.config.ts`)**

- The global header adds `script-src 'unsafe-inline' 'unsafe-eval' …`, which effectively disables CSP’s mitigation value and allows inline script injection.
- Remove the unsafe directives for production builds; if inline scripts are needed, adopt nonces/hashes and gate the relaxed policy behind `NODE_ENV === "development"`.

### Low

**8. `reportError` ignores severity (`src/lib/errorReporter.ts`)**

- The helper always calls `logger.error` even when `context.severity` is `warning`/`info`, so dashboards and alerting cannot distinguish noise from signal.
- Use `logger[severity]` (falling back to `error`) and ensure structured fields propagate `severity` for downstream sinks (Stackdriver/Sentry).

## Testing & Coverage Notes

- No automated coverage exists for the highest-risk endpoints (`profiles/search`, `recruiters/*`, `user/profile`). Regression tests only cover a few AI routes; recruiter workflows lack unit or integration tests.
- The Firebase client SDK usage inside API routes is not exercised in Jest (which runs in jsdom), so misconfigurations won’t fail until runtime. Adding minimal server-side tests that instantiate the route handlers with mocked `adminDb` would catch these regressions early.

## Recommended Next Steps

1. Ship a hotfix for `/api/user/profile` that hardcodes server-derived tier/role values and rejects unauthorized PUT/POST payloads.
2. Gate every recruiter API with `getAuthenticatedUserId` + role checks, move them onto the admin SDK, and re-issue all outstanding contact tokens.
3. Replace the in-memory limiter with a Firestore/Redis-backed version before re-enabling anonymous or AI-heavy endpoints; otherwise keep them internal.
4. Refactor `profiles/search` and `recruiter/search-resumes` to use admin queries with pagination and filters that run server-side, or delegate search entirely to the existing Firestore vector function.
5. Tighten the CSP and add route-level unit tests for both entitlement changes and recruiter PII operations to prevent regressions.
