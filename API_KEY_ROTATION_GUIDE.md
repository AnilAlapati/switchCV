# 🔒 API KEY ROTATION GUIDE

**URGENT**: The following API keys were exposed and MUST be rotated immediately.

---

## Exposed Keys to Rotate

### 1. Firebase API Key

**Exposed Value**: `AIzaSyDxPBYfgCyaPThLlUPG_IEqOHRDe0Ci6vI`  
**Project**: switchcv-e5136

**Steps to Rotate**:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project `switchcv-e5136`
3. Go to **Project Settings** (gear icon)
4. Click **Service Accounts** tab
5. Scroll to **Web API Key**
6. Delete the old key
7. Create a new key: **Click "Create API Key"**
8. Copy the new key to `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=<NEW_KEY>
```

### 2. Gemini API Key

**Exposed Value**: `AIzaSyDWEg83gh4zt7D1pXK4jpr_BGj_5lx35I0`

**Steps to Rotate**:

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Delete** on the exposed key
3. Click **Create API Key**
4. Select project `switchcv-e5136` (or create new)
5. Copy to `.env.local`:

```bash
GEMINI_API_KEY=<NEW_KEY>
NEXT_PUBLIC_GEMINI_API_KEY=<NEW_KEY>
```

**Important**:

- Optionally, restrict key to your domain only:
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Select project
  3. Go to **APIs & Services > Credentials**
  4. Find the Gemini API key
  5. Click on it and set **Application restrictions** to **HTTP referrers**
  6. Add your domain: `https://yourdomain.com/*`

### 3. HuggingFace Token

**Exposed Value**: `***REMOVED***`

**Steps to Rotate**:

1. Go to [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Find the exposed token
3. Click the **trash icon** to delete it
4. Create a **New token**:
   - Name: `SwitchCV App`
   - Type: `read` (if only reading models) or `write` (if fine-tuning)
5. Copy to `.env.local`:

```bash
HUGGINGFACE_TOKEN=<NEW_TOKEN>
NEXT_PUBLIC_HUGGINGFACE_TOKEN=<NEW_TOKEN>
```

---

## After Rotating Keys

### 1. Update `.env.local`

```bash
# Update with new values
NEXT_PUBLIC_FIREBASE_API_KEY=<NEW_FIREBASE_KEY>
GEMINI_API_KEY=<NEW_GEMINI_KEY>
NEXT_PUBLIC_GEMINI_API_KEY=<NEW_GEMINI_KEY>
HUGGINGFACE_TOKEN=<NEW_HUGGINGFACE_TOKEN>
NEXT_PUBLIC_HUGGINGFACE_TOKEN=<NEW_HUGGINGFACE_TOKEN>
```

### 2. Verify `.env.local` NOT in Git History

```bash
# Check if .env.local was ever committed
git log --follow -- .env.local

# If it shows commits, remove from history:
# Option A: Remove entire file history (careful!)
git filter-branch --tree-filter 'rm -f .env.local' HEAD

# Option B: Use git-filter-repo (recommended)
# Install: pip install git-filter-repo
git filter-repo --path .env.local --invert-paths
```

### 3. Test New Keys

```bash
# Test Firebase key
npm run dev
# Check if app loads without errors

# Test Gemini API
# Try creating a resume (uses Gemini)

# Test HuggingFace
# Monitor network tab or logs
```

### 4. Deploy to Production

```bash
# Push code with auth fixes
git add .
git commit -m "Security: Add API authentication and fix logging"
git push origin feature/Nov_15

# In your deployment platform (Vercel, Firebase Hosting, etc.):
# 1. Set environment variables:
#    NEXT_PUBLIC_FIREBASE_API_KEY=<NEW_KEY>
#    GEMINI_API_KEY=<NEW_KEY>
#    HUGGINGFACE_TOKEN=<NEW_TOKEN>
# 2. Deploy the application
```

---

## Verify No Exposed Keys

### Check Current `.env.local`

```bash
# See what's in the file (only you should see this)
cat .env.local
```

### Check for secrets in code

```bash
# Search for API key patterns
grep -r "AIzaSy" src/ --include="*.ts" --include="*.tsx" --include="*.js"
grep -r "hf_" src/ --include="*.ts" --include="*.tsx" --include="*.js"

# Should return: No results (good!)
```

### Check Git history

```bash
# Ensure .env.local is not in history
git log --oneline -- .env.local | wc -l
# Should return: 0

# Double-check for API key strings in commits
git log -p | grep -i "AIzaSy\|hf_" | wc -l
# Should return: 0
```

---

## Additional Security Measures

### 1. Set API Key Restrictions in Google Cloud

**For Gemini API Key**:

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Find your API key
3. Click to edit
4. Under **Application restrictions**, select:
   - **HTTP referrers (websites)**
   - Add your domain: `https://switchcv.app/*`

### 2. Set Firebase API Key Restrictions

Firebase Web API keys have limited permissions by default (Web SDK only), but you can add domain restrictions:

1. Firebase Console > Project Settings
2. Web API Key settings
3. Domain restrictions: Add your domain

### 3. HuggingFace Token Scopes

When creating new token, select minimal required scope:

- `read`: For accessing models
- `write`: Only if fine-tuning
- Never select all scopes

---

## Monitoring

After rotation, monitor for:

### Unauthorized API Usage

```bash
# Check Firebase Console for unusual activity:
# - Authentication tab: Look for unexpected sign-ups
# - Firestore: Check for unusual queries
# - Cloud Functions: Check for errors

# Check Google Cloud Console:
# - APIs & Services > Quotas
# - APIs & Services > Usage
```

### Cost Alerts

Set up billing alerts in:

- **Firebase Console**: Project Settings > Billing
- **Google Cloud Console**: Billing > Budgets & alerts
- **HuggingFace**: Account settings

---

## Checklist

- [ ] Rotated Firebase API Key
- [ ] Rotated Gemini API Key
- [ ] Rotated HuggingFace Token
- [ ] Updated `.env.local`
- [ ] Verified old keys deleted from provider dashboards
- [ ] Tested app with new keys
- [ ] Checked `.env.local` not in Git history
- [ ] Set domain restrictions on API keys
- [ ] Set up cost monitoring/alerts
- [ ] Deployed to production
- [ ] Monitored logs for errors

---

## Questions or Issues?

If you encounter issues after key rotation:

1. **App won't start**: Check `.env.local` has all required keys
2. **Firebase not working**: Verify Firebase API key and project ID match
3. **Gemini not working**: Check API is enabled in Google Cloud Console
4. **HuggingFace not working**: Verify token has proper scopes

See `SECURITY_AUDIT_REPORT.md` for more details on security improvements.
