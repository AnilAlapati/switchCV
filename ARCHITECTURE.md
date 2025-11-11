# 🏗️ AI API Architecture

## Before (Broken) ❌

```
┌─────────────────┐
│   Browser       │
│  (Client Code)  │
└────────┬────────┘
         │ Direct API call with key exposed
         │ ❌ CORS blocked!
         │ ❌ Key in browser!
         ↓
┌─────────────────┐
│  External APIs  │
│ Gemini/HuggingFace│
└─────────────────┘
```

**Problems:**
- CORS blocks cross-origin requests
- API keys exposed in browser (security risk!)
- Hard to handle errors and fallbacks
- Gemini 404 error (wrong endpoint)

---

## After (Fixed) ✅

```
┌─────────────────┐
│   Browser       │
│  (Client Code)  │
└────────┬────────┘
         │ fetch("/api/ai/generate")
         │ ✅ Same origin (no CORS!)
         │ ✅ No keys exposed!
         ↓
┌─────────────────┐
│  Your Server    │
│  Next.js API    │
│  Route Handler  │
└────────┬────────┘
         │ Reads API keys from .env.local
         │ ✅ Secure!
         │ ✅ Proper endpoint!
         ↓
┌─────────────────┐
│  External APIs  │
│ 1. Gemini (try) │
│ 2. HuggingFace  │
│    (fallback)   │
└─────────────────┘
```

**Benefits:**
- ✅ No CORS issues (same-origin request)
- ✅ API keys secure (server-side only)
- ✅ Automatic fallback (Gemini → HuggingFace)
- ✅ Centralized error handling
- ✅ Easy to add rate limiting/caching

---

## Code Flow

### 1. Client Request
```tsx
// src/app/create-resume/page.tsx
const response = await fetch("/api/ai/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Generate greeting...",
    maxTokens: 150,
    temperature: 0.9
  })
});

const data = await response.json();
console.log(data.text); // AI response
console.log(data.model); // Which model was used
```

### 2. Server Handles Request
```typescript
// src/app/api/ai/generate/route.ts
export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  
  // Try Gemini first
  try {
    const apiKey = process.env.GEMINI_API_KEY; // Secure!
    const response = await fetch(`https://...`, {
      headers: { /* with API key */ }
    });
    return NextResponse.json({ text, model: "Gemini" });
  } catch (error) {
    // Fallback to HuggingFace
    ...
  }
}
```

### 3. Response Flow
```
Server → Gemini API → Success!
       ↓
Client ← { text: "...", model: "Gemini" }
```

---

## Security Model

### Environment Variables

```bash
# .env.local (NEVER commit to git!)

# ❌ WRONG - Client-accessible
NEXT_PUBLIC_GEMINI_API_KEY=xxx  # BAD!

# ✅ RIGHT - Server-only
GEMINI_API_KEY=xxx              # GOOD!
```

**Rule:** 
- `NEXT_PUBLIC_*` = Available in browser (use for non-sensitive data)
- No prefix = Server-only (use for API keys!)

---

## File Structure

```
switchCV/
├── .env.local              # Your API keys (not in git!)
├── .env.local.example      # Template
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── ai/
│   │   │       └── generate/
│   │   │           └── route.ts    # 🔑 Server-side handler
│   │   └── create-resume/
│   │       └── page.tsx            # Client code
│   └── ...
└── ...
```

---

## API Endpoint Details

### Request Format
```typescript
POST /api/ai/generate
Content-Type: application/json

{
  "prompt": "Your prompt here...",
  "maxTokens": 150,      // optional
  "temperature": 0.9     // optional
}
```

### Response Format (Success)
```typescript
200 OK
{
  "text": "Generated response...",
  "model": "Gemini 1.5 Flash",
  "provider": "google"
}
```

### Response Format (Error)
```typescript
503 Service Unavailable
{
  "error": "All AI providers failed",
  "details": {
    "gemini": "Gemini API key not configured",
    "huggingface": "HuggingFace token not configured"
  }
}
```

---

## Why This Pattern?

1. **Separation of Concerns**
   - Client: UI and user interaction
   - Server: API calls and business logic

2. **Security by Design**
   - API keys never leave server
   - Can add auth/rate limiting easily

3. **Better Error Handling**
   - Centralized error logic
   - Automatic fallbacks

4. **Scalability**
   - Easy to add caching
   - Can switch providers without client changes
   - Load balancing possible

---

## Common Pattern for External APIs

This pattern works for ANY external API:

```typescript
// ✅ CORRECT: Server-side route
src/app/api/[service]/route.ts

// Handles:
// - /api/openai
// - /api/stripe
// - /api/sendgrid
// - etc.
```

**Always use server-side routes for:**
- Payment processing (Stripe, PayPal)
- Email sending (SendGrid, Mailgun)
- AI APIs (OpenAI, Anthropic, etc.)
- Database operations
- Any service requiring API keys

---

## Testing

```bash
# Test your setup
node test-ai-api.js

# Should see:
✅ Gemini API: Working!
✅ HuggingFace API: Working!
🎉 You're ready to go!
```

---

**Remember:** Server-side = Simple, Secure, No CORS! 🚀
