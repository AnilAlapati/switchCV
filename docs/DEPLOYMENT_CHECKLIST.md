# Deployment Checklist

> **💡 Automation Available:** You can automate these steps using GitHub Actions. See [DEPLOYMENT_AUTOMATION.md](DEPLOYMENT_AUTOMATION.md) for setup instructions.

## Pre-Deployment

### 1. Environment Variables ⚙️

Add these to Firebase Functions configuration:

```bash
# Required for AI services
firebase functions:config:set \
  huggingface.token="YOUR_TOKEN" \
  gemini.api_key="YOUR_KEY"

# Required for email
firebase functions:config:set \
  email.service="gmail" \
  email.user="your-email@gmail.com" \
  email.password="your-app-password" \
  email.from_name="SwitchCV"

# Application settings
firebase functions:config:set \
  app.website_url="https://switchcv.com" \
  app.environment="production" \
  app.log_level="info"

# View current config
firebase functions:config:get
```

### 2. Review Code Changes 📝

- [ ] All TypeScript files compile without errors ✅
- [ ] No breaking changes introduced ✅
- [ ] Backward compatibility maintained ✅
- [ ] Documentation updated ✅

### 3. Test Locally (Optional) 🧪

```bash
cd functions
npm run build
firebase emulators:start --only functions
```

## Deployment Steps

### Step 1: Deploy Firestore Indexes 📊

**Why first?** Functions will fail without proper indexes.

```bash
firebase deploy --only firestore:indexes
```

**Expected Output:**

```
✔ Deploy complete!
Indexes created successfully
```

**Verify:** Check Firebase Console → Firestore → Indexes

### Step 2: Build Functions 🔨

```bash
cd functions
npm run build
```

**Expected Output:**

```
> tsc
[No errors]
```

### Step 3: Deploy Functions 🚀

```bash
firebase deploy --only functions
```

**Expected Output:**

```
✔ functions[aggregateGlobalStats(us-central1)] Successful update
✔ functions[aggregateAnalyticsDaily(us-central1)] Successful update
✔ functions[cleanupAnalyticsEvents(us-central1)] Successful update
✔ Deploy complete!
```

**Time Estimate:** 5-10 minutes

### Step 4: Deploy Specific Function (if needed) 🎯

```bash
# Deploy only the stats aggregation function
firebase deploy --only functions:aggregateGlobalStats
```

## Post-Deployment Verification

### Immediate (0-5 minutes)

#### 1. Check Deployment Status ✅

```bash
firebase functions:list
```

**Verify:** All functions show "ACTIVE" status

#### 2. Check Logs 📋

```bash
firebase functions:log --limit 50
```

**Look for:**

- ✅ "Configuration loaded successfully"
- ✅ No error messages
- ⚠️ Configuration warnings (acceptable)

#### 3. Test HTTP Endpoints 🌐

```bash
# Test with curl (replace with your function URL)
curl -X POST https://us-central1-switchcv-e5136.cloudfunctions.net/generateResumeContent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "resumeData": {...},
    "modelId": "gemini-1.5-flash"
  }'
```

**Expected:**

- 401 Unauthorized (if no token) ✓
- 429 Too Many Requests (if rate limited) ✓
- 200 OK (if valid request) ✓

### First Hour Monitoring 🔍

#### 1. Monitor Error Rates

```bash
# Stream logs in real-time
firebase functions:log --tail
```

**Watch for:**

- Circuit breaker transitions
- Retry attempts
- Rate limit violations
- Configuration issues

#### 2. Check Firestore

Open Firebase Console → Firestore

**Verify Collections Exist:**

- [ ] `rateLimits` - Rate limit tracking
- [ ] `monitoring/metrics` - Performance data
- [ ] `monitoring/alerts` - System alerts

#### 3. Test Rate Limiting

Make multiple rapid requests to the same endpoint.

**Expected:**

- First 10 requests: Success
- 11th request: 429 Too Many Requests
- Response headers include `X-RateLimit-*`

### First Day Monitoring 📊

#### 1. Review Metrics (8 hours after deployment)

Firebase Console → Functions → Select Function → Metrics

**Check:**

- [ ] Invocation count (should be normal)
- [ ] Execution time (should be improved)
- [ ] Error rate (should be <1%)
- [ ] Memory usage (should be stable)

#### 2. Review Alerts

```bash
# Query for alerts
firebase firestore:get monitoring/alerts
```

**Expected:** No critical alerts

#### 3. Check Performance

```bash
# Get performance summary
firebase functions:log --limit 100 | grep "duration"
```

**Look for:** Consistent execution times

## Rollback Plan 🔄

### If Issues Occur

#### 1. Immediate Rollback

```bash
# Redeploy previous version
git checkout <previous-commit>
firebase deploy --only functions
```

#### 2. Disable Problem Function

```bash
# Delete specific function
firebase functions:delete <functionName>
```

#### 3. Emergency Fix

```bash
# Update config to disable features
firebase functions:config:set \
  security.enable_rate_limit="false"

firebase deploy --only functions
```

## Gradual Rollout Strategy 🎯

### Phase 1: Canary Deployment (10% traffic)

1. Deploy to separate function name
2. Route 10% of traffic
3. Monitor for 24 hours

### Phase 2: Partial Rollout (50% traffic)

1. Increase to 50%
2. Monitor for 48 hours

### Phase 3: Full Rollout (100% traffic)

1. Switch all traffic
2. Monitor for 1 week

## Success Criteria ✅

### Must Have

- [ ] All functions deployed successfully
- [ ] Firestore indexes created
- [ ] No critical errors in logs
- [ ] Error rate < 1%
- [ ] No alerts triggered

### Should Have

- [ ] Rate limiting working correctly
- [ ] Circuit breakers initialized
- [ ] Monitoring data being collected
- [ ] Configuration warnings resolved

### Nice to Have

- [ ] Performance improved by 20%+
- [ ] Zero failed invocations
- [ ] All monitoring dashboards set up

## Troubleshooting 🔧

### Issue: "Configuration errors"

**Solution:**

```bash
# Check config
firebase functions:config:get

# Set missing values
firebase functions:config:set key="value"
firebase deploy --only functions
```

### Issue: "Index not found"

**Solution:**

```bash
# Redeploy indexes
firebase deploy --only firestore:indexes

# Wait 5 minutes for indexes to build
# Then redeploy functions
firebase deploy --only functions
```

### Issue: High error rate

**Solution:**

1. Check logs: `firebase functions:log`
2. Look for specific error patterns
3. Check external service status (Gemini, HuggingFace)
4. Verify environment variables
5. Consider rollback if >5% error rate

### Issue: Rate limiting too aggressive

**Solution:**

```bash
# Temporarily increase limits
# Edit firestore/rateLimits documents
# Or adjust in code and redeploy
```

## Contact & Support 📞

### For Deployment Issues

1. Check Firebase Console status page
2. Review GitHub issues
3. Check Cloud Status dashboard

### For Code Issues

1. Review logs in Cloud Console
2. Check monitoring metrics
3. Refer to ARCHITECTURE_IMPROVEMENTS.md

## Post-Deployment Tasks 📝

### Week 1

- [ ] Daily log review
- [ ] Monitor error rates
- [ ] Adjust rate limits if needed
- [ ] Document any issues

### Week 2

- [ ] Review performance metrics
- [ ] Optimize slow queries
- [ ] Update documentation
- [ ] Plan next improvements

### Month 1

- [ ] Full performance review
- [ ] Security audit
- [ ] Cost analysis
- [ ] User feedback review

---

**Deployment Owner:** DevOps Team  
**Last Updated:** November 22, 2025  
**Next Review:** December 22, 2025

**Status:** ✅ Ready for Production Deployment
