# SwitchCV Troubleshooting Guide

**Last Updated:** November 11, 2025

This document contains solutions to common issues encountered during development and deployment of SwitchCV.

## Table of Contents

1. [Development Server Issues](#development-server-issues)
2. [Firebase Functions Issues](#firebase-functions-issues)
3. [Frontend Issues](#frontend-issues)
4. [AI Integration Issues](#ai-integration-issues)

---

## Development Server Issues

### Issue: Next.js dev server not starting

**Symptoms:**

- Port 3000 is already in use
- Server fails to start

**Solutions:**

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use this
ps aux | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill -9

# Then restart
npm run dev
```

### Issue: "Ready in X ms" but page not loading

**Root Cause:** The page is still compiling. Wait 5-10 seconds after "Ready" message.

**Verification:**

```bash
# Check if server is responding
curl -s http://localhost:3000 | head -20
```

---

## Firebase Functions Issues

### Issue: `getSdkVersion is not a function` Error

**Date Fixed:** November 11, 2025

**Root Cause:** Version mismatch between `firebase-admin` and `firebase-functions` packages.

**Solution:**

```bash
cd functions
rm -rf node_modules lib
npm install
npm run build
```

**Package versions that work:**

- `firebase-admin`: ^12.0.0 or later
- `firebase-functions`: ^5.0.0 or later
- `typescript`: ^5.3.0

### Issue: Functions not compiling - missing build script

**Date Fixed:** November 11, 2025

**Root Cause:** No build script in `functions/package.json`

**Solution:** Added build script to package.json:

```json
{
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  }
}
```

### Issue: Functions emulator shuts down immediately

**Symptoms:** Emulator starts then immediately receives SIGINT

**Root Cause:** Terminal command being interrupted by other commands

**Solution:** Start in dedicated terminal:

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Functions (in separate terminal)
cd functions
npm run serve
```

---

## Frontend Issues

### Issue: "Unexpected end of JSON input" Error

**Date Fixed:** November 11, 2025

**Root Cause:** `JSON.parse()` being called on empty or malformed data from Firestore

**Location:** `src/app/resume/[slug]/page.tsx` line 72

**Solution:** Added validation before parsing:

```typescript
// Before (Error-prone)
let enhancedContent = null;
try {
  enhancedContent = JSON.parse(resume.generatedText.polished);
} catch (e) {
  console.error("Error parsing enhanced content:", e);
}

// After (Fixed)
let enhancedContent = null;
try {
  if (resume.generatedText?.polished && resume.generatedText.polished.trim()) {
    enhancedContent = JSON.parse(resume.generatedText.polished);
  }
} catch (e) {
  console.error("Error parsing enhanced content:", e);
  console.error("Problematic data:", resume.generatedText?.polished);
}
```

**Prevention:** Always validate data existence and format before parsing JSON.

### Issue: Blank page on localhost:3000

**Symptoms:**

- Browser loads but shows nothing
- No console errors

**Root Causes & Solutions:**

1. **Page still compiling:**

   - Wait 10-30 seconds after starting server
   - Check terminal for "✓ Compiled /" message

2. **Firebase not initialized:**

   - Verify `.env.local` exists with correct Firebase config
   - Check browser console for Firebase errors

3. **Cache issues:**
   ```bash
   rm -rf .next
   npm run dev
   ```

---

## AI Integration Issues

### Issue: Hugging Face API calls failing

**Symptoms:**

- Resume generation fails
- 401 Unauthorized errors

**Solutions:**

1. **Verify API Key:**

   ```bash
   # Check .env.local
   cat .env.local | grep HUGGINGFACE_TOKEN
   ```

2. **Test API Key:**

   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3
   ```

3. **Check Firebase Functions Config:**
   ```bash
   firebase functions:config:get
   ```

### Issue: AI responses are slow or timeout

**Root Cause:** Hugging Face Inference API cold starts

**Solutions:**

1. Use models with lower latency: `gpt2`, `distilgpt2`
2. Increase timeout in functions:

   ```typescript
   export const generateResumeContent = functions
     .runWith({ timeoutSeconds: 540 }) // 9 minutes
     .https.onRequest(async (req, res) => {
       // ...
     });
   ```

3. Consider upgrading to Hugging Face PRO for faster inference

---

## Common Commands Reference

### Development

```bash
# Start frontend
npm run dev

# Start functions emulator
cd functions && npm run serve

# Build functions
cd functions && npm run build

# Clean build
rm -rf .next node_modules
npm install
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Deployment

```bash
# Deploy functions only
firebase deploy --only functions

# Deploy hosting only
npm run build
firebase deploy --only hosting

# Deploy everything
npm run build
firebase deploy
```

### Debugging

```bash
# Check running processes
ps aux | grep -E "next dev|firebase emulators"

# Check ports
lsof -i :3000
lsof -i :5001

# View function logs
firebase functions:log

# Clear all caches
rm -rf .next functions/lib node_modules functions/node_modules
npm install
cd functions && npm install
```

---

## Environment Setup Checklist

Before starting development, ensure:

- [ ] Node.js v20 installed
- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] `.env.local` file exists with all required variables
- [ ] Dependencies installed in root: `npm install`
- [ ] Dependencies installed in functions: `cd functions && npm install`
- [ ] Functions built: `cd functions && npm run build`

---

## Getting Help

If you encounter an issue not covered here:

1. Check browser console for errors
2. Check terminal output for stack traces
3. Review Firebase Functions logs: `firebase functions:log`
4. Check this troubleshooting guide
5. Search GitHub issues
6. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

---

## Version Information

### Working Versions (as of Nov 11, 2025)

**Frontend:**

- Next.js: 16.0.1
- React: 19.0.0-rc
- Firebase: 11.0.2
- TypeScript: 5.7.2

**Functions:**

- Node: 20
- firebase-functions: 5.1.1
- firebase-admin: 12.7.0
- @huggingface/inference: 2.6.4
- TypeScript: 5.3.0

**Development Tools:**

- Firebase CLI: (latest)
- npm: (latest)
