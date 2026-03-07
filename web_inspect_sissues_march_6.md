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
Low severity. This is not a direct compromise. A mitigation was added in middleware by clearing `x-powered-by` on middleware-managed responses, but final live verification requires deployment because the current production site still reflects the previous release.

**Risk level:** Low

---

### 3. Public `/api/system-config` reveals operational detail

**Status:** Real but mostly information exposure

**Why it matters:**
The public response includes model names, quotas, budget caps, approval settings, and admin contact information. That is useful reconnaissance, but it is not the same as exposing credentials.

**Evidence found:**
The public route returned fields including:

- AI model preferences
- tier and quota limits
- `agentic.budgetCap`
- `userApproval.adminEmail`

**Assessment:**
This is not a critical secret leak in the current architecture because much of the config is already used client-side and some defaults are bundled into client code. Fixing it safely needs a larger separation between public config and internal config.

**Action taken in this patch:**
Documented only. No direct code change in this patch.

**Risk level:** Low to Medium

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
- [src/**tests**/middleware/security-headers.test.ts](src/__tests__/middleware/security-headers.test.ts)

## Tests added

- Page requests now receive CSP and security headers
- Invalid cross-site state-changing API requests still fail and keep security headers

## Validation performed

### Live validation completed before code fix

- Confirmed missing CSP on page responses
- Confirmed unauthenticated API protection is active
- Confirmed sampled source maps are not public
- Confirmed no obvious secret strings in sampled production bundles

### Repository validation after code fix

- Targeted middleware tests passed: `2/2`
- Quick quality gate passed: `quality:quick`

## Residual follow-up items

1. Deploy the middleware fix and verify live headers again on `/`, `/auth`, and `/create-resume`
2. Decide whether to split `/api/system-config` into:
   - a minimal public client config route
   - a private internal/server config path
3. Re-check whether `x-powered-by` is still visible after deployment

## Outcome

The missing page CSP was a real issue and was fixed in code. The `system-config` exposure and `x-powered-by` header are real but lower-severity hardening concerns; they are documented here, with the config exposure intentionally deferred to a broader refactor.
