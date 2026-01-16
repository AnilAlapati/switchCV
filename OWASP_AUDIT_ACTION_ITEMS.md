# OWASP Audit - Priority Action Items
**Date:** January 15, 2026  
**Source:** OWASP_Top_10_Security_Audit_2026-01-15.md

Quick reference for implementing security improvements identified in the audit.

---

## 🔴 CRITICAL - Immediate (This Week)

### 1. Update Firebase Dependencies
**Priority:** Critical  
**Effort:** 30 minutes  
**Risk if delayed:** Medium

```bash
npm update firebase firebase-admin
npm test
```

**Current → Target:**
- `firebase: 12.5.0 → 12.9.0`
- `firebase-admin: 13.6.0 → 13.7.0`

**Verification:**
```bash
npm list firebase firebase-admin
npm run quality
```

---

### 2. Update Next.js
**Priority:** Critical  
**Effort:** 30 minutes  
**Risk if delayed:** Low

```bash
npm update next @next/third-parties
npm run build
npm test
```

**Current → Target:**
- `next: 16.0.10 → 16.1.2`

---

### 3. Update Sentry SDK
**Priority:** High  
**Effort:** 15 minutes  
**Risk if delayed:** Low

```bash
npm update @sentry/nextjs
npm run build
```

**Current → Target:**
- `@sentry/nextjs: 10.27.0 → 10.27.2`

---

## 🟡 HIGH - This Week

### 4. Migrate Secrets to Firebase Secret Manager
**Priority:** High  
**Effort:** 5-7 hours  
**Risk if delayed:** Medium

**Documentation:** [docs/SECRET_ROTATION_IMPLEMENTATION.md](file:///Users/anilalapati/Development/Switch_cv_Nov_21/docs/SECRET_ROTATION_IMPLEMENTATION.md)

**Steps:**
1. Review implementation plan in docs
2. Create `SecretManagerService`
3. Deploy secrets to Firebase Secret Manager:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   firebase functions:secrets:set OPENAI_API_KEY
   firebase functions:secrets:set GROQ_API_KEY
   firebase functions:secrets:set TOKEN_SECRET
   ```
4. Update code to use secret manager
5. Test in development
6. Deploy to production
7. Remove secrets from `.env.local`

**Benefits:**
- ✅ Automated rotation alerts
- ✅ Audit trail for secret access
- ✅ Version control for secrets
- ✅ SOC 2 compliance

---

### 5. Audit Production Error Messages
**Priority:** High  
**Effort:** 2-3 hours  
**Risk if delayed:** Low

**Task:** Review all API error responses to ensure no sensitive information leakage

**Focus Areas:**
- Authentication errors
- Authorization failures
- Database errors
- AI generation failures

**Pattern to check:**
```typescript
// ❌ Bad - leaks internals
return NextResponse.json({ error: error.message }, { status: 500 });

// ✅ Good - generic message
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
```

---

## 🟢 MEDIUM - This Quarter

### 6. Add DOMPurify for XSS Protection
**Priority:** Medium  
**Effort:** 2 hours  
**Risk if delayed:** Low

**Installation:**
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**Usage:**
```typescript
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(userGeneratedHTML);
```

**Apply to:**
- Resume content display
- User profile descriptions
- Feedback/support messages

---

### 7. Implement Subresource Integrity (SRI)
**Priority:** Medium  
**Effort:** 1-2 hours  
**Risk if delayed:** Low

**Current:**
```html
<script src="https://www.googletagmanager.com/gtag/js"></script>
```

**Updated:**
```html
<script 
  src="https://www.googletagmanager.com/gtag/js" 
  integrity="sha384-[HASH]"
  crossorigin="anonymous"
></script>
```

**Generate hashes:**
```bash
curl https://www.googletagmanager.com/gtag/js | openssl dgst -sha384 -binary | openssl base64 -A
```

---

### 8. Plan Firebase Tools v15 Migration
**Priority:** Medium  
**Effort:** 4-6 hours  
**Risk if delayed:** Low

**Current:** `firebase-tools: 14.27.0`  
**Latest:** `firebase-tools: 15.3.0` (Major version)

**Steps:**
1. Review v15 changelog
2. Test in development branch
3. Update deployment scripts
4. Deploy to staging
5. Monitor for issues
6. Deploy to production

---

### 9. Add MFA for Admin Accounts
**Priority:** Medium  
**Effort:** 3-4 hours  
**Risk if delayed:** Low

**Firebase Auth supports:**
- SMS verification
- TOTP (Google Authenticator, Authy)

**Implementation:**
```typescript
// Require MFA for admin role
if (userRole === 'admin' && !user.multiFactor.enrolledFactors.length) {
  return { error: "MFA required for admin accounts" };
}
```

---

### 10. Set Up Automated Dependency Updates
**Priority:** Medium  
**Effort:** 2-3 hours  
**Risk if delayed:** Low

**Options:**

1. **GitHub Dependabot** (Free)
   - Create `.github/dependabot.yml`
   - Auto-creates PRs for updates

2. **Renovate Bot** (Free, more features)
   - More granular control
   - Grouping of updates

**Example `.github/dependabot.yml`:**
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

---

## 🔵 LOW - Future Enhancements

### 11. Implement Field-Level Encryption for PII
**Priority:** Low  
**Effort:** 1-2 weeks  
**Risk if delayed:** Low (Firebase provides baseline)

**Approach:**
- Encrypt resume content before Firestore storage
- Use Google Cloud KMS for key management
- Transparent encryption/decryption layer

---

### 12. Add Security Event Alerting
**Priority:** Low  
**Effort:** 4-6 hours  

**Implementation:**
- Slack/email alerts for:
  - Multiple failed login attempts
  - Admin role changes
  - Suspicious API usage patterns
  - Rate limit violations

---

### 13. Document Log Retention Policies
**Priority:** Low  
**Effort:** 2-3 hours  

**Define:**
- How long to keep different log types
- Automated cleanup procedures
- Compliance requirements

---

## Quick Update Commands

### Update All Patch/Minor Versions
```bash
npm update
npm test
npm run quality
```

### Check for Outdated Packages
```bash
npm outdated
```

### Check for Security Vulnerabilities
```bash
npm audit
npm audit fix
```

---

## Verification Checklist

After implementing updates:

- [ ] Run full test suite: `npm test`
- [ ] Run quality checks: `npm run quality`
- [ ] Build production: `npm run build`
- [ ] Test in development: `npm run dev`
- [ ] Deploy to staging first
- [ ] Monitor error rates for 24-48 hours
- [ ] Deploy to production

---

## Tracking Progress

Recommended: Create GitHub issues for each action item

**Labels:**
- `security` - Security-related
- `dependencies` - Dependency updates
- `critical` - High priority
- `enhancement` - New features

**Milestones:**
- "Security Audit - Week 1" (Critical items)
- "Security Audit - Q1 2026" (Medium items)
- "Security Audit - Future" (Low priority items)

---

## Resources

- **Full Audit Report:** [OWASP_Top_10_Security_Audit_2026-01-15.md](file:///Users/anilalapati/Development/Switch_cv_Nov_21/OWASP_Top_10_Security_Audit_2026-01-15.md)
- **Secret Rotation Plan:** [docs/SECRET_ROTATION_IMPLEMENTATION.md](file:///Users/anilalapati/Development/Switch_cv_Nov_21/docs/SECRET_ROTATION_IMPLEMENTATION.md)
- **Firebase Code Review:** [docs/FIREBASE_BACKEND_CODE_REVIEW_JAN_15_2026.md](file:///Users/anilalapati/Development/Switch_cv_Nov_21/docs/FIREBASE_BACKEND_CODE_REVIEW_JAN_15_2026.md)

---

**Next Audit Recommended:** April 2026 (Quarterly)
