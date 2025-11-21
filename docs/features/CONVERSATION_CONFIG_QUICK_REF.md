# Conversation Configuration - Quick Reference

## TL;DR

✅ **Context window**: 20 messages (configurable to 100+)  
✅ **Max questions in beta**: 6 (configurable)  
✅ **Smart questions**: Enabled - avoids asking the same question twice  
✅ **Easy to change**: Just set `RESUME_MODE` environment variable

## Quick Setup

### Beta Mode (Current)

```bash
npm run dev
# Or explicitly:
RESUME_MODE=beta npm run dev
```

Settings:

- Asks max 6 questions
- Remembers last 20 messages
- Asks smart questions (only critical fields first)
- Creates resume at 60% completion

### Production Mode (Future)

```bash
RESUME_MODE=production npm start
```

Settings:

- Asks unlimited questions
- Remembers last 50 messages
- Asks comprehensive questions
- Creates resume at 80% completion

## Change Any Setting

Edit `src/lib/services/conversationConfig.ts`:

```typescript
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 20, // ← Change this (e.g., 100)
  maxBetaQuestions: 6, // ← Change this (e.g., 10)
  enableSmartQuestions: true, // ← Change this
  completionThreshold: 60, // ← Change this (e.g., 50)
  // ... more options
};
```

## How Smart Questions Work

1. **Tracks conversation history** - Knows what's already been asked
2. **Prioritizes fields** - Asks in order: name → email → summary → experience → education → skills
3. **Limits questions** - After 6 questions, offers to create resume
4. **Context window** - AI remembers last 20 messages, won't repeat questions

### Example

```
Turn 1: "What's your name?" (Q1)
Turn 2: "What's your email?" (Q2) ← Will NOT ask again
Turn 3: "Tell me about your role..." (Q3)
Turn 4: "Any education?" (Q4)
Turn 5: "Key skills?" (Q5)
Turn 6: "Company name?" (Q6)
Turn 7: "I have great info! Ready to create?" ← No more questions
```

## For Tomorrow

Tomorrow, if you want 100 questions or larger context window:

```typescript
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 100, // ← Increased from 20
  maxBetaQuestions: 100, // ← Increased from 6
  enableSmartQuestions: true, // Keep smart questions
  completionThreshold: 90, // ← Increased requirement
  // ... rest of config
};
```

## Files Modified

- `src/lib/services/conversationConfig.ts` - New config file
- `src/lib/services/resumePrompts.ts` - Uses configurable context window
- `src/app/api/resume/generate/route.ts` - Uses config for decisions

## Key Features

| Feature            | Before              | After                          |
| ------------------ | ------------------- | ------------------------------ |
| Context window     | Hardcoded 6         | **Configurable**               |
| Max questions      | Unlimited           | **6 (beta), unlimited (prod)** |
| Repeated questions | Yes, possible       | **No, smart selection**        |
| Config changes     | Code edit + rebuild | **Environment variable**       |

---

**See**: `CONVERSATION_CONFIG_GUIDE.md` for detailed documentation
