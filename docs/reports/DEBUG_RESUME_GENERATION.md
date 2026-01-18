# Resume Generation Debug Guide

## Current Issue

User is seeing "500 Internal Server Error" and "Your session has expired" messages when trying to create a resume.

## Debug Steps

### 1. Check Browser Console

Open browser DevTools (F12) and look for:

- 🔑 Got ID token message
- 📡 API Response status message
- Any detailed error objects (should now show actual error messages instead of `{}`)

### 2. Check AI Provider Configuration

The app tries multiple AI providers in order. Verify you have at least ONE API key configured:

```bash
# Check your .env.local file
cat .env.local | grep -E "(GEMINI_API_KEY|OPENAI_API_KEY|GROQ_API_KEY|ANTHROPIC_API_KEY)"
```

**Required:** At least one of these must be set:

- `GEMINI_API_KEY` - Google Gemini (recommended for basic tier)
- `GROQ_API_KEY` - Groq (free tier)
- `OPENAI_API_KEY` - OpenAI GPT models
- `ANTHROPIC_API_KEY` - Claude models

### 3. Check Firebase Configuration

```bash
# Verify Firebase project ID is set
cat .env.local | grep NEXT_PUBLIC_FIREBASE_PROJECT_ID
```

### 4. Test API Endpoint Directly

Create a test file `test-resume-api.js`:

```javascript
const fetch = require("node-fetch");

async function testResumeAPI() {
  // Replace with your actual Firebase ID token
  const idToken = "YOUR_ID_TOKEN_HERE";

  const response = await fetch("http://localhost:3000/api/resume/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      message:
        "My name is John Doe, email john@example.com, I'm a software engineer",
      conversationHistory: [],
      sessionData: null,
    }),
  });

  console.log("Status:", response.status);
  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

testResumeAPI().catch(console.error);
```

### 5. Check Server Logs

In your terminal running `npm run dev`, look for:

- ✅ Authenticated user generating resume
- Error messages about AI providers
- Firestore errors

### 6. Common Issues & Solutions

#### Issue: "AI service temporarily unavailable"

**Cause:** No AI provider configured or all providers failing
**Solution:**

```bash
# Add at least one API key to .env.local
echo 'GEMINI_API_KEY=your_gemini_key_here' >> .env.local
# Restart dev server
```

#### Issue: "Your session has expired"

**Cause:** Firebase token expired or invalid
**Solution:**

- The new code now auto-retries with a fresh token
- If it still fails, try logging out and back in
- Check Firebase Auth configuration

#### Issue: "500 Internal Server Error"

**Cause:** Various backend errors
**Solution:**

- Check server logs for the actual error
- Verify all environment variables are set
- Check Firestore permissions

### 7. Enable Verbose Logging

Add to `.env.local`:

```bash
LOG_LEVEL=debug
```

Then restart your dev server to see more detailed logs.

### 8. Check User Subscription Tier

The error might be tier-related. Check in Firestore:

- Go to Firebase Console > Firestore
- Find your user document in `users` collection
- Verify `subscriptionTier` field (should be "basic", "premium", or "enterprise")

### 9. Test with Dev Mode Override

In `.env.local`, add:

```bash
DEV_MODE_ENABLED=true
DEV_TIER_OVERRIDE=premium
```

This bypasses subscription checks and gives you premium features for testing.

## Expected Console Output (Success)

```
🔑 Got ID token, making API request...
📡 API Response status: 200
[Server logs]
✅ Authenticated user generating resume:
Trying Gemini 2.0 Flash...
Gemini 2.0 Flash success
✅ Resume created successfully: 12345
```

## Expected Console Output (Failure - No API Keys)

```
🔑 Got ID token, making API request...
📡 API Response status: 500
{
  err: {
    message: 'All AI providers failed. Errors: {...}',
    stack: '...',
    name: 'Error'
  },
  errorType: 'Error',
  errorString: 'Error: All AI providers failed...'
} Error generating resume:
```

## Next Steps

1. Open the app in your browser
2. Open DevTools Console (F12)
3. Try to create a resume
4. Copy all console output
5. Check server terminal for backend logs
6. Share both logs for further debugging

The enhanced error logging should now show the actual error message instead of `{}`.
