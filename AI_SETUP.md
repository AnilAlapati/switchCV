# AI API Setup Guide

## Why API calls were failing:

1. **Gemini 404 Error**: Incorrect API endpoint (was using `/v1/models/`, should be `/v1beta/models/`)
2. **HuggingFace CORS Error**: Browser can't directly call external APIs due to CORS policy
3. **Security Issue**: API keys exposed in client-side code (NEVER use `NEXT_PUBLIC_` for API keys!)

## ✅ Fixed Solution:

- Created server-side API route: `/src/app/api/ai/generate/route.ts`
- API keys are now server-side only (secure!)
- No CORS issues (server-to-server communication)
- Updated client code to call our own API endpoint

## 🔧 Setup Steps:

### 1. Create `.env.local` file

```bash
# In your project root
cp .env.local.example .env.local
```

### 2. Get Gemini API Key (FREE!)

1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key and paste it in `.env.local`:

```
GEMINI_API_KEY=AIzaSy...your_actual_key...
```

### 3. Get HuggingFace Token (FREE!)

1. Go to: https://huggingface.co/settings/tokens
2. Click "New token"
3. Give it a name like "SwitchCV"
4. Copy the token and paste it in `.env.local`:

```
HUGGINGFACE_TOKEN=hf_...your_actual_token...
```

### 4. Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

## 🎯 How It Works Now:

```
Browser (Client)  →  /api/ai/generate  →  Gemini/HuggingFace
                          (Your Server)       (External APIs)
```

1. Client calls YOUR server endpoint: `fetch("/api/ai/generate")`
2. Your server reads API keys from `.env.local`
3. Your server calls Gemini (or HuggingFace as fallback)
4. Response flows back to client

## 🔒 Security Benefits:

- ✅ API keys never exposed to browser
- ✅ No CORS issues
- ✅ Rate limiting possible
- ✅ Can add authentication/authorization
- ✅ Keys stay in `.env.local` (not in git!)

## 📝 Example `.env.local`:

```bash
# AI API Keys (Server-side only)
GEMINI_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456
HUGGINGFACE_TOKEN=hf_AbCdEfGhIjKlMnOpQrStUvWxYz123456789

# Firebase (can be public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

## 🚨 Important:

- **NEVER** commit `.env.local` to git!
- **NEVER** use `NEXT_PUBLIC_` prefix for API keys
- The `.env.local` file is already in `.gitignore`

## 🧪 Testing:

1. Add your API keys to `.env.local`
2. Restart dev server: `npm run dev`
3. Go to: http://localhost:3000/create-resume
4. Open browser console (F12) to see logs
5. You should see: "✅ Gemini API connected successfully!"

## 🎉 Making API calls IS easy when done right!

Server-side = Simple, Secure, No CORS! 🚀
