# 🎯 Quick Start: Get Your AI Working

## The Problem Was:

❌ Client-side API calls = CORS errors, security issues, complexity  
✅ **Solution: Server-side API route** = Simple, secure, works everywhere!

---

## 🚀 Get Started in 3 Steps:

### Step 1: Create `.env.local`

```bash
cp .env.local.example .env.local
```

### Step 2: Add Your API Keys

**Get Gemini Key (FREE - Recommended!):**

1. Visit: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy and paste in `.env.local`:
   ```
   GEMINI_API_KEY=AIzaSy...your_key_here...
   ```

**OR Get HuggingFace Token (FREE - Alternative):**

1. Visit: https://huggingface.co/settings/tokens
2. Click "New token"
3. Copy and paste in `.env.local`:
   ```
   HUGGINGFACE_TOKEN=hf_...your_token_here...
   ```

> **You only need ONE of them to work!** The app tries Gemini first, then HuggingFace as backup.

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal)
npm run dev
```

---

## ✅ Test It:

**Option 1: Quick Test**

```bash
node test-ai-api.js
```

**Option 2: Browser Test**

1. Go to: http://localhost:3000/create-resume
2. Open console (F12)
3. Look for: "✅ Gemini API connected successfully!"

---

## 📝 What Changed:

### Before (❌ Broken):

```tsx
// Client-side code trying to call APIs directly
const response = await fetch(`https://generativelanguage.googleapis.com/...`, {
  /* CORS error! */
});
```

### After (✅ Fixed):

```tsx
// Client calls YOUR server
const response = await fetch("/api/ai/generate", {
  method: "POST",
  body: JSON.stringify({ prompt: "..." }),
});
```

Your server handles the API calls (no CORS, secure!)

---

## 🎉 Why This Is Better:

1. **No CORS Issues** - Server-to-server communication
2. **Secure** - API keys never exposed to browser
3. **Simple** - One endpoint, automatic fallback
4. **Reliable** - Built-in error handling

---

## 💡 Key Files Changed:

- ✅ `/src/app/api/ai/generate/route.ts` - Server-side API handler
- ✅ `/src/app/create-resume/page.tsx` - Client now calls our API
- ✅ `.env.local.example` - Template for your keys
- ✅ `AI_SETUP.md` - Detailed documentation
- ✅ `test-ai-api.js` - Test your setup

---

## 🆘 Troubleshooting:

**"Unable to connect to AI services"**

- Check `.env.local` exists
- Verify API key format (should start with `AIzaSy` for Gemini)
- Restart dev server after adding keys

**"Gemini API error: 404"**

- Fixed! Was using wrong endpoint (now `/v1beta/`)

**"HuggingFace: Failed to fetch"**

- Fixed! Now using server-side calls (no CORS)

---

## 📚 More Info:

- Full details: `AI_SETUP.md`
- API route code: `src/app/api/ai/generate/route.ts`

---

**Yes, making API calls IS easy when done right! 🚀**

Server-side = No CORS + Secure + Simple
