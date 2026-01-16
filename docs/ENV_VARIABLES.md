# Environment Variables Reference

Complete reference of all environment variables used in SwitchCV with their purposes, required status, and default values.

## Firebase Configuration

### Public Firebase Config (Browser-Safe)

These variables are safe to expose to the browser and are required for Firebase client SDK initialization.

| Variable                                   | Required | Purpose                 | Example                     |
| ------------------------------------------ | -------- | ----------------------- | --------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | ✅ Yes   | Firebase API key        | `YOUR_API_KEY_HERE`         |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | ✅ Yes   | Firebase auth domain    | `switchcv.firebaseapp.com`  |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | ✅ Yes   | Firebase project ID     | `switchcv-prod`             |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | ✅ Yes   | Firebase storage bucket | `switchcv-prod.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ Yes   | FCM sender ID           | `123456789`                 |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | ✅ Yes   | Firebase app ID         | `YOUR_APP_ID_HERE`          |

### Firebase Admin SDK (Server-Side Only - Secret)

These variables must **NEVER** be exposed to the browser. They're used for server-side Firebase operations.

| Variable                 | Required            | Purpose                                                | Example                          |
| ------------------------ | ------------------- | ------------------------------------------------------ | -------------------------------- |
| `FIREBASE_ADMIN_SDK_KEY` | ✅ Yes (Production) | Firebase Admin SDK private key (JSON string or base64) | `{"type":"service_account",...}` |

**⚠️ IMPORTANT:** This is a sensitive secret. Store it securely in your hosting platform's secret manager.

---

## AI & External APIs

### Gemini API

| Variable         | Required            | Purpose               | Example     |
| ---------------- | ------------------- | --------------------- | ----------- |
| `GEMINI_API_KEY` | ✅ Yes (Production) | Google Gemini API key | `YOUR_API_KEY_HERE` |

**Access:** https://ai.google.dev/

### HuggingFace API

| Variable            | Required | Purpose                                   | Example                    |
| ------------------- | -------- | ----------------------------------------- | -------------------------- |
| `HUGGINGFACE_TOKEN` | ❌ No    | HuggingFace API token (optional fallback) | `YOUR_TOKEN_HERE`          |

**Access:** https://huggingface.co/settings/tokens

---

## Application Configuration

| Variable                  | Required | Default                 | Purpose                | Example                       |
| ------------------------- | -------- | ----------------------- | ---------------------- | ----------------------------- |
| `NODE_ENV`                | ✅ Yes   | `development`           | Environment mode       | `production` or `development` |
| `NEXT_PUBLIC_APP_URL`     | ❌ No    | `http://localhost:3000` | Base URL for app       | `https://switchcv.app`        |
| `NEXT_PUBLIC_APP_VERSION` | ✅ Auto  | (from package.json)     | App version (auto-set) | `0.0.97`                      |

---

## Development Configuration

These variables are only used in development and override production settings.

| Variable               | Required | Purpose                           | Example                              |
| ---------------------- | -------- | --------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_DEV_MODE` | ❌ No    | Enable development mode overrides | `true`                               |
| `NEXT_PUBLIC_DEV_TIER` | ❌ No    | Override subscription tier in dev | `enterprise` or `premium` or `basic` |
| `NEXT_PUBLIC_DEV_ROLE` | ❌ No    | Override user role in dev         | `recruiter` or `jobseeker`           |

### Using Development Overrides

```bash
# Test as enterprise recruiter
NEXT_PUBLIC_DEV_MODE=true NEXT_PUBLIC_DEV_TIER=enterprise NEXT_PUBLIC_DEV_ROLE=recruiter npm run dev

# Test as basic tier jobseeker
NEXT_PUBLIC_DEV_MODE=true NEXT_PUBLIC_DEV_TIER=basic npm run dev
```

---

## Setup Instructions

### 1. Create `.env.local` File

```bash
cd /Users/anilalapati/Development/Switch_cv_Nov_21
cp .env.local.example .env.local
```

### 2. Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click "Project Settings" (gear icon)
4. Click "Your apps" section
5. Select Web app
6. Copy the config object

### 3. Fill in Public Firebase Variables

Update `.env.local` with values from Firebase console:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Get Firebase Admin SDK Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts tab
3. Click "Generate New Private Key"
4. Save the JSON file

### 5. Set Admin SDK Key

Option A: Store entire JSON as base64:

```bash
# Convert JSON to base64 (macOS/Linux)
base64 < service-account-key.json > key.txt
# Copy contents of key.txt to .env.local
```

Option B: Store as JSON string:

```bash
# Just paste the JSON contents directly
FIREBASE_ADMIN_SDK_KEY='{"type":"service_account",...}'
```

### 6. Get AI API Keys

#### Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Add to `.env.local`:

```bash
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

#### HuggingFace Token (Optional)

1. Go to [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Add to `.env.local`:

```bash
HUGGINGFACE_TOKEN=YOUR_TOKEN_HERE
```

### 7. Validate Environment

Run validation to ensure all required variables are set:

```bash
npm run build
# If validation passes, you'll see no errors
```

---

## .env.local.example Template

```bash
# ====================
# FIREBASE - PUBLIC (Safe for browser)
# ====================
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# ====================
# FIREBASE - PRIVATE (Server-only - DO NOT COMMIT!)
# ====================
FIREBASE_ADMIN_SDK_KEY=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6InlvdXItcHJvamVjdC1pZCIsIn...

# ====================
# AI PROVIDERS
# ====================
GEMINI_API_KEY=YOUR_API_KEY_HERE
HUGGINGFACE_TOKEN=YOUR_TOKEN_HERE

# ====================
# APPLICATION
# ====================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ====================
# DEVELOPMENT (Optional - Dev Testing)
# ====================
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_DEV_TIER=enterprise
NEXT_PUBLIC_DEV_ROLE=recruiter
```

---

## Troubleshooting

### "Missing required environment variables" Error

**Problem:** Build fails with environment validation error.

**Solution:**

1. Check all variables in `.env.local`
2. Run: `npm run build` to see which are missing
3. Add missing variables to `.env.local`
4. Verify variable names are exact (case-sensitive)

### Firebase Connection Errors

**Problem:** "Cannot read property 'apiKey' of undefined"

**Solution:**

1. Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set
2. Check values match Firebase project settings exactly
3. Restart dev server: `npm run dev`

### AI API Returns 401 (Unauthorized)

**Problem:** "Invalid API key" error from Gemini or HuggingFace

**Solution:**

1. Verify API key is correct and not expired
2. Check API key has necessary permissions
3. Regenerate key if needed
4. Ensure key is in `.env.local` (not `.env`)

### Development Overrides Not Working

**Problem:** Subscription tier still shows as "basic"

**Solution:**

1. Set all three variables:
   ```bash
   NEXT_PUBLIC_DEV_MODE=true
   NEXT_PUBLIC_DEV_TIER=enterprise
   NEXT_PUBLIC_DEV_ROLE=recruiter
   ```
2. Restart dev server
3. Clear browser cache

---

## Production Deployment

### On Vercel

1. Go to Project Settings → Environment Variables
2. Add each non-public variable:

   - `FIREBASE_ADMIN_SDK_KEY`
   - `GEMINI_API_KEY`
   - `HUGGINGFACE_TOKEN` (optional)

3. Do NOT add `NEXT_PUBLIC_*` variables (use Firebase config)

### On Firebase Hosting

1. Store secrets in [Secret Manager](https://console.cloud.google.com/security/secret-manager)
2. Inject into Cloud Run:
   ```yaml
   env:
     - name: FIREBASE_ADMIN_SDK_KEY
       valueFrom:
         secretKeyRef:
           name: firebase-admin-key
   ```

### Security Best Practices

✅ **DO:**

- Use platform secret managers (Vercel, AWS Secrets Manager, etc.)
- Rotate API keys periodically
- Use separate keys for dev, staging, and production
- Audit who has access to secrets

❌ **DON'T:**

- Commit `.env.local` to git (it's in `.gitignore`)
- Paste secrets in Slack or email
- Use the same key across environments
- Share production keys with developers

---

## Validation Script

Check that all required environment variables are set:

```bash
# Automatic validation (runs on build)
npm run build

# Manual validation
node -e "require('./src/lib/validateEnv').validateEnv()"
```

---

## See Also

- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Gemini API](https://ai.google.dev/)
- [HuggingFace API](https://huggingface.co/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Last Updated:** December 16, 2025  
**Version:** 1.0
