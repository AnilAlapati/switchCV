# SwitchCV Security Scan Report (Feb 23, 2026)

**Date**: February 23, 2026
**Scope**: Codebase static analysis, dependency audit, authentication & authorization in API routes, and Firebase rules review.

## Executive Summary

The overall security posture of the SwitchCV application is **strong** at the application code level, with robust implementations for authentication, origin validation, and authorization checks. However, there are pending **high-severity dependency vulnerabilities** that need to be addressed through package updates.

---

## 1. Hardcoded Secrets & Credentials
**Status**: ✅ **PASS**
- **Methodology**: Scanned the codebase for hardcoded `API_KEY`, `secret`, `password`, and `token` patterns.
- **Findings**: 
  - All identified keys (e.g., `GEMINI_API_KEY`, `OPENAI_API_KEY`, `HUGGINGFACE_TOKEN`) are strictly confined to `*.test.ts` files or mock services. 
  - Production code correctly retrieves secrets via Next.js environment variables or the `secretManagerService`.

## 2. Cross-Site Scripting (XSS)
**Status**: ✅ **PASS**
- **Methodology**: Scanned for unsafe React DOM manipulations like `dangerouslySetInnerHTML`.
- **Findings**:
  - No instances of `dangerouslySetInnerHTML` or similar unsafe DOM injections were found in the `src/` directory. 
  - The application relies on standard Next.js and React escaping, effectively mitigating common XSS vectors.

## 3. API Authentication & Authorization
**Status**: ✅ **PASS**
- **Methodology**: Sampled Next.js API route handlers in `src/app/api/`.
- **Findings**:
  - **Auth Enforcement**: All examined routes correctly invoke `getAuthenticatedUserId(request)` (from `src/lib/utils/api-helpers.ts`) before processing logic.
  - **Ownership/Role Checks**: Strong checks are in place. For instance, `api/user/profile` strictly asserts that the requesting `userId` matches the updated/requested `uid`.
  - **CORS Mitigation**: The helper methods invoke `validateCorsOrigin` and `createCorsHeaders` systematically.

## 4. Input Validation & Rate Limiting
**Status**: ✅ **PASS**
- **Methodology**: Inspected request body parsing and API limiters.
- **Findings**:
  - **Validation**: Strict schema validation using Zod (`CreateUserProfileSchema`, `UpdateUserProfileSchema`) is heavily utilized in controllers to sanitize inputs.
  - **Rate Limiting**: Distributed rate limiting (`aiSearchRateLimiter` and `checkDistributedRateLimit`) is correctly wired into sensitive/expensive endpoints like recruiter searches and AI generations.
  - **Payload Size**: The `safeParseBody` utility enforces a strict 1MB size limit to prevent payload-based DoS.

## 5. Firebase Rules Configuration
**Status**: ✅ **PASS**
- **Methodology**: Reviewed `firestore.rules` and `storage.rules`.
- **Findings**:
  - **Firestore**: Implements strict `isAuthenticated()`, `isOwner()`, `isAdmin()`, and `isRecruiter()` checks. Fields are restricted using `hasOnly()`. "System" queries properly reject client-side read/writes entirely.
  - **Storage**: Correctly enforces a 5MB general limit and a 2MB limit for public avatars, ensuring avatars (`/profiles/{userId}/public/`) remain readable while strictly securing all other user folders.

## 6. Dependency Vulnerabilities (`npm audit`)
**Status**: ⚠️ **ACTION REQUIRED**
- **Methodology**: Ran `npm audit --json` against the application tree.
- **Findings**: Several High and Moderate vulnerabilities were flagged in project dependencies.
  - **High Severity**: 
    - `@sentry/nextjs` (v9.20.0 update available)
    - `firebase-tools` (v3.18.2 update available)
    - `eslint` & `@typescript-eslint/*` ecosystem vulnerabilities.
    - `@jest/core` / `babel-jest` ecosystem.
    - `fast-xml-parser` (DoS vulnerability through entity expansion).
  - **Moderate/Low**:
    - `hono` (timing comparison hardening)
    - `ajv` (ReDoS via `$data` option).

### Dependency Risk Assessment & Patches Applied

To secure the application without introducing breaking changes to the Next.js and testing ecosystems, we employed **`package.json` overrides** to patch specific high-risk transitive dependencies.

#### Successfully Patched (Risk Eliminated)
- **`fast-xml-parser`** (Severity: Critical): Patched via override (`^4.4.1`). 
  - *Risk Avoided*: Entity Expansion DoS (Billion Laughs Attack). This was the most critical vulnerability, as the application processes user-uploaded Resumes/CVs.
  - *Status*: **RESOLVED**.
- **`ajv` & `nanoid`**: Patched via override.
  - *Risk Avoided*: ReDoS during input schema validation. 
  - *Status*: **RESOLVED**.

#### Unpatched Dependencies (Accepted Risk)
The following dependencies remain unpatched because updating them requires major version upgrades that will break the current development workflow (e.g., migrating to ESLint 9's Flat Config). The risk here is **ACCEPTED** because these are purely development/build-time tools that are not exposed to end-users in the production environment.

1.  **`@sentry/nextjs`** (Severity: High)
    - *The Vulnerability*: The vulnerability is in a transitive dependency used for its webpack plugin during the build process, not the code that ships to the browser.
    - *Risk if unfixed*: **Very Low**. The vulnerable code only runs locally or in CI/CD pipelines during `npm run build`. 
2.  **`eslint` & `@typescript-eslint` ecosystem** (Severity: High)
    - *The Vulnerability*: ReDoS (Regular Expression Denial of Service) in internal string parsing utilities.
    - *Risk if unfixed*: **Zero**. ESLint only runs during active development (`npm run lint`). It has absolutely no presence or execution path in the production build.
3.  **`@jest/core` ecosystem** (Severity: High)
    - *The Vulnerability*: Various transitive vulnerabilities in how Jest resolves dependencies and handles mock snapshots.
    - *Risk if unfixed*: **Zero**. Testing frameworks are never deployed to the production server.
4.  **`firebase-tools`** (Severity: High)
    - *The Vulnerability*: Vulnerabilities in underlying libraries used to zip files (`archiver`) before uploading them to Google's servers.
    - *Risk if unfixed*: **Very Low**. This is a developer CLI tool. It only runs on the developer's machine during the `scripts/deploy.sh` execution.

**Conclusion**: The application's runtime environment is secure. The remaining audit warnings pertain exclusively to local development tooling. We accept this tech debt until a future date when upgrading the core development framework (Next.js/ESLint ecosystem) is warranted.
