# Pre-Deployment Security Checklist

Use this checklist before deploying SwitchCV to production to ensure all security measures are in place.

## ✅ Environment & Configuration

- [ ] **Environment Variables Validated**
  - [ ] All required env vars are set (run `validateEnv()`)
  - [ ] No hardcoded secrets in code
  - [ ] API keys are server-side only (no `NEXT_PUBLIC_*` for keys)
  - [ ] `.env.local` is in `.gitignore`
  - [ ] `.env.local.example` has only dummy values

- [ ] **Firebase Configuration**
  - [ ] Admin SDK initialized with production credentials
  - [ ] Firestore backup configured in production project
  - [ ] Firebase rules tested in production environment

- [ ] **Build Configuration**
  - [ ] Production build succeeds: `npm run build`
  - [ ] No build warnings or errors
  - [ ] CSP headers enabled for production

## 🔐 Security

### Authentication & Authorization

- [ ] **All protected endpoints require authentication**
  - [ ] Use `getAuthenticatedUserId()` on protected routes
  - [ ] No public endpoints expose PII
  - [ ] Admin routes verify admin role

- [ ] **Ownership Verification Implemented**
  - [ ] Users cannot access others' resumes
  - [ ] Users cannot modify others' profiles
  - [ ] Recruiter operations scoped to recruiter's account

- [ ] **Role-Based Access Control**
  - [ ] Jobseeker role restricted features
  - [ ] Recruiter role restricted features
  - [ ] Admin role restricted features

### Data Protection

- [ ] **PII Handled Securely**
  - [ ] No email addresses logged in production
  - [ ] No phone numbers exposed in API responses
  - [ ] Sensitive fields masked for public views
  - [ ] Access request system implemented

- [ ] **Encryption**
  - [ ] HTTPS enforced (all traffic encrypted)
  - [ ] HSTS header set with preload
  - [ ] Cookies marked as Secure and HttpOnly

### API Security

- [ ] **Input Validation**
  - [ ] All API routes validate input with zod schemas
  - [ ] File upload size limits enforced (5MB)
  - [ ] Query parameters validated
  - [ ] Request body size limited (1MB default)

- [ ] **Error Handling**
  - [ ] No error messages expose internal details
  - [ ] Use `handleSecureApiError()` for all errors
  - [ ] Auth errors are generic (don't reveal user existence)
  - [ ] Database errors are generic (don't expose schema)

- [ ] **Rate Limiting**
  - [ ] Rate limits applied to search endpoints
  - [ ] Rate limits applied to AI generation endpoints
  - [ ] Rate limits applied to access request endpoints
  - [ ] Retry-After headers set on 429 responses

- [ ] **CORS Headers**
  - [ ] Explicit CORS headers set
  - [ ] Origins validated against whitelist
  - [ ] Credentials properly configured

### Firestore Security

- [ ] **Firestore Rules Tested**
  - [ ] User documents can only be read by owner
  - [ ] Role field cannot be escalated
  - [ ] Tier field cannot be changed by user
  - [ ] Public profiles accessible without auth
  - [ ] Test coverage for all rules

- [ ] **Firestore Indexes**
  - [ ] All necessary composite indexes created
  - [ ] Indexes configured in production
  - [ ] No overly broad queries

## 🧪 Testing

- [ ] **Security Tests Pass**
  - [ ] `npm test -- security` passes all tests
  - [ ] No console errors in test output
  - [ ] Authentication tests pass
  - [ ] Authorization tests pass

- [ ] **API Route Tests**
  - [ ] Critical API routes tested
  - [ ] Error scenarios tested
  - [ ] Rate limiting tested
  - [ ] Edge cases covered

- [ ] **Integration Tests**
  - [ ] Firestore integration tests pass
  - [ ] Firebase Auth integration tests pass
  - [ ] External API integrations tested

## 📊 Performance

- [ ] **Bundle Size Optimized**
  - [ ] Production bundle < 200KB (gzipped)
  - [ ] No unused dependencies
  - [ ] Tree shaking enabled
  - [ ] Code splitting working

- [ ] **Database Queries Optimized**
  - [ ] No N+1 queries
  - [ ] Firestore indexes used
  - [ ] Pagination implemented
  - [ ] Caching considered

- [ ] **API Performance**
  - [ ] Response times acceptable (< 500ms)
  - [ ] Rate limiting doesn't block legitimate traffic
  - [ ] Timeout values reasonable

## 📝 Documentation

- [ ] **Security Documentation Updated**
  - [ ] `docs/SECURITY.md` covers all security practices
  - [ ] Examples use secure patterns
  - [ ] Common vulnerabilities documented

- [ ] **API Documentation Updated**
  - [ ] `docs/API_TESTING.md` has latest API patterns
  - [ ] Error codes documented
  - [ ] Rate limits documented

- [ ] **Deployment Documentation Updated**
  - [ ] `docs/DEPLOYMENT.md` has latest steps
  - [ ] Environment variables documented
  - [ ] Troubleshooting guide updated

## 🚨 Monitoring & Logging

- [ ] **Error Monitoring Configured**
  - [ ] Sentry configured with production DSN
  - [ ] Error tracking enabled
  - [ ] Alerts configured

- [ ] **Access Logging**
  - [ ] API requests logged (without PII)
  - [ ] Authentication events logged
  - [ ] Admin actions logged

- [ ] **Rate Limit Monitoring**
  - [ ] Anomalies detected
  - [ ] Alerts for excessive rate limiting

## 🔄 Dependencies

- [ ] **Dependencies Scanned**
  - [ ] `npm audit` shows no critical vulnerabilities
  - [ ] All high-risk packages updated
  - [ ] Dev dependencies don't have known CVEs

- [ ] **Package Versions Pinned**
  - [ ] Critical packages pinned to exact versions
  - [ ] No `*` or `latest` in production dependencies

## 📋 Final Checks

- [ ] **Code Review**
  - [ ] Security review completed
  - [ ] Performance review completed
  - [ ] No hardcoded secrets found

- [ ] **Staging Environment**
  - [ ] Deployed to staging first
  - [ ] All tests pass on staging
  - [ ] Manual testing completed
  - [ ] Security scan passed

- [ ] **Backup & Disaster Recovery**
  - [ ] Firestore backups configured
  - [ ] Database backups tested
  - [ ] Recovery plan documented

- [ ] **Compliance**
  - [ ] GDPR compliance checked
  - [ ] Privacy policy updated
  - [ ] Terms of service updated
  - [ ] Data retention policies set

## 🚀 Deployment

- [ ] **Pre-Deployment**
  - [ ] All checklist items completed
  - [ ] Last backup taken
  - [ ] Rollback plan ready
  - [ ] Monitoring ready
  - [ ] Team notified

- [ ] **Deployment**
  - [ ] Deploy to production
  - [ ] Verify deployment successful
  - [ ] Check application health
  - [ ] Run smoke tests

- [ ] **Post-Deployment**
  - [ ] Monitor error logs
  - [ ] Check performance metrics
  - [ ] Verify all features working
  - [ ] Check rate limiting active

## 📞 Post-Deployment

- [ ] **Verify All Systems**
  - [ ] Authentication working
  - [ ] All API endpoints responding
  - [ ] Database queries fast
  - [ ] No errors in logs

- [ ] **User Communication**
  - [ ] Notify users of deployment (if needed)
  - [ ] Check for support requests
  - [ ] Monitor social media

- [ ] **Close the Loop**
  - [ ] Document deployment issues
  - [ ] Update runbooks
  - [ ] Schedule security review

---

## Checklist Sign-Off

**Prepared by:** ________________  
**Date:** ________________  
**Project Version:** ________________  

**Reviewed by:** ________________  
**Date:** ________________  

**Approved for Production:** ☐  

---

## Notes

Use this section to document any deviations or special considerations for this deployment:

```


```

---

## Quick Reference

### Environment Variables to Check

```bash
# Required in production
FIREBASE_ADMIN_SDK_KEY=xxx
GEMINI_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
NODE_ENV=production
```

### Key Files to Review

- `next.config.ts` - Security headers
- `firestore.rules` - Database security
- `src/lib/validateEnv.ts` - Env validation
- `src/app/api/**/*` - API routes
- `docs/SECURITY.md` - Security guidelines

### Useful Commands

```bash
# Validate environment
npm run build && npm start

# Run security tests
npm test -- security

# Check for vulnerabilities
npm audit

# Analyze bundle
npm run build -- --analyze

# Run linter
npm run lint

# Run all tests
npm test -- --coverage
```

---

**Last Updated:** December 16, 2025  
**Version:** 1.0  
**Maintained by:** Security Team
