# Web Inspect Security Issues — March 6, 2026

## Purpose

Validate whether a live attacker using browser devtools, direct HTTP requests, or simple route probing can learn too much or exploit missing browser-side protections.

## What was checked

- Live response headers for `/`, `/auth`, and `/create-resume`
- Unauthenticated access to selected protected APIs
- Public `.js.map` availability for shipped production bundles
- Obvious secret leakage in sampled production JS bundles
- Existing route auth audit in the repository

## Findings

### 1. Missing CSP on page responses

**Status:** Real issue

**Why it matters:**
A missing `Content-Security-Policy` on rendered pages weakens the app's browser-side XSS defenses. If any markup injection bug is introduced later, the lack of CSP makes payload execution easier and impact higher.

**Evidence found:**
Live responses for `/`, `/auth`, and `/create-resume` did not include a `Content-Security-Policy` header, even though middleware code was building one.

**Root cause:**
In [src/middleware.ts](src/middleware.ts), the middleware returned early for non-API routes before adding CSP and nonce headers.

**Fix applied:**

- Middleware now applies CSP, nonce, and request tracing headers to application page requests as well as API responses.
- API-only controls like rate limiting and CSRF validation still run only for `/api/**` paths.

**Risk level:** High

---

### 2. `X-Powered-By: Next.js` visible in live responses

**Status:** Real but low severity

**Why it matters:**
This exposes framework fingerprinting information. It does not by itself create an exploit, but it helps reconnaissance.

**Evidence found:**
Live production headers included `x-powered-by: Next.js`.

**Assessment:**
Low severity. This is not a direct compromise. A mitigation attempt was added in middleware, but post-deployment verification shows `x-powered-by` is still present in live responses. This likely means the header is being injected after middleware processing by the hosting/runtime layer.

**Follow-up investigation:**

- [next.config.ts](next.config.ts) already sets `poweredByHeader: false`
- Next.js docs state that `poweredByHeader: false` should disable the header
- Firebase's framework-aware Next.js hosting docs say the CLI respects Next.js settings, but the same docs also warn that this integration is still an early public preview and recommend App Hosting for full-stack Next.js apps

**Current conclusion:**
This remaining header is most likely a platform/runtime behavior in the Firebase framework-hosting path, not an application-code bug that can be fully fixed from inside this repository alone.

**Risk level:** Low

---

### 3. Public `/api/system-config` reveals operational detail

**Status:** Real issue, now reduced

**Why it matters:**
The public response includes model names, quotas, budget caps, approval settings, and admin contact information. That is useful reconnaissance, but it is not the same as exposing credentials.

**Evidence found:**
The public route returned fields including:

- AI model preferences
- tier and quota limits
- `agentic.budgetCap`
- `userApproval.adminEmail`

**Assessment:**
This was a real information-exposure issue. It was not a credential leak, but it unnecessarily exposed operational details that were useful for reconnaissance.

**Action taken in this patch:**
- The public route now returns only the client-required subset of config.
- Operational fields such as AI model preferences, agentic budget caps, and user approval admin contact details are no longer returned by `/api/system-config`.

**Risk level:** Reduced from Low/Medium to Low

---

## What was _not_ found

- No unauthenticated access to sampled protected routes:
  - `/api/admin/stats` returned `401`
  - `/api/user/profile` returned `401`
- No sampled public source maps for tested JS bundles (`404`)
- No obvious secret strings found in sampled production JS bundles
- Repository API audit reported no missing-auth route issues

## Files changed

- [src/middleware.ts](src/middleware.ts)
- [src/__tests__/middleware/security-headers.test.ts](src/__tests__/middleware/security-headers.test.ts)
- [src/app/api/system-config/route.ts](src/app/api/system-config/route.ts)
- [src/__tests__/api/system-config.test.ts](src/__tests__/api/system-config.test.ts)

## Tests added

- Page requests now receive CSP and security headers
- Invalid cross-site state-changing API requests still fail and keep security headers
- Public system-config responses now exclude internal-only fields while preserving client-required fields

## Validation performed

### Live validation completed before code fix

- Confirmed missing CSP on page responses
- Confirmed unauthenticated API protection is active
- Confirmed sampled source maps are not public
- Confirmed no obvious secret strings in sampled production bundles

### Repository validation after code fix

- Targeted middleware tests passed: `2/2`
- Quick quality gate passed: `quality:quick`

### Live validation after deployment

- Production redeployed successfully on `v0.1.45`
- `/`, `/auth`, and `/create-resume` now return `Content-Security-Policy`
- Page responses now include per-request `x-nonce` and `x-request-id`
- `x-powered-by: Next.js` is still present after deployment

### Repository validation after system-config hardening

- Route tests verify the public config subset and exclusion of internal fields
- Existing hook/provider consumers continue to rely on the returned public subset plus client-side defaults

## Residual follow-up items

1. If server-only callers need dynamic internal config over HTTP, introduce a separate authenticated/internal config path
2. If removing `x-powered-by` is a strict requirement, test whether Firebase App Hosting or a different SSR deployment path removes it upstream

## Outcome

The missing page CSP was a real issue and is now fixed live in production. The public `system-config` exposure has been reduced by limiting the route to client-required fields only. The remaining `x-powered-by` header is still a low-severity hosting-layer concern.
