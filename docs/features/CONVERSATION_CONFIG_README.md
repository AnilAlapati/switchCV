# Conversation Configuration System

> Making the resume conversation smarter, more configurable, and user-friendly.

## The Problem You Reported

After 4-5 questions, the AI asked for your name again—even though you'd already provided it ("Anil A").

**Root Cause**:

1. Context window was too small (only 6 messages)
2. Name extraction didn't handle initials
3. No way to prevent repeated questions

## The Solution

### ✅ Fixed Context Window

- **Before**: 6 messages (forgot history quickly)
- **After**: 20 messages (remembers entire conversation)
- **Tomorrow**: Scale to 100+ with one config change

### ✅ Smarter Name Extraction

Now correctly recognizes:

- "Anil A" ✓
- "Anil A." ✓
- "John Doe" ✓
- "Sarah Jane Smith" ✓

### ✅ Smart Question Limiting

In beta mode:

- Max 6 questions (prevents user fatigue)
- Asks priority fields first (name → email → summary → experience → education → skills)
- When limit reached: "I have good info. Create resume now?"

### ✅ Fully Configurable

Change behavior without code changes:

```bash
# Current (beta)
npm run dev
# Context: 20, Max Questions: 6

# Tomorrow (increase context)
# Edit one line in conversationConfig.ts
contextWindowSize: 100
# Restart. Done!
```

## How It Works

### Configuration File

**Location**: `src/lib/services/conversationConfig.ts`

Two modes included:

```typescript
// BETA MODE (current - minimal questions)
{
  contextWindowSize: 20,
  maxBetaQuestions: 6,
  enableSmartQuestions: true,
  completionThreshold: 60
}

// PRODUCTION MODE (future - comprehensive)
{
  contextWindowSize: 50,
  maxBetaQuestions: Infinity,
  enableSmartQuestions: false,
  completionThreshold: 80
}
```

### How It Flows

```
User provides data
      ↓
Configuration system loads (DEFAULT_CONFIG or PRODUCTION_CONFIG)
      ↓
API processes request with config
      ↓
Prompt builder uses context size from config
      ↓
AI receives: recent messages + smart hints + question limit
      ↓
AI response + decision to create resume (based on config threshold)
```

## Using It

### Current (Beta - 6 Questions Max)

```bash
npm run dev
```

**What happens**:

1. You answer: name, email, summary, experience, education, skills
2. After 6 Q&A turns, AI offers: "Ready to create resume?"
3. No more questions asked
4. AI remembers all answers (20-message context)

### Switch to Production (Unlimited Questions)

```bash
RESUME_MODE=production npm start
```

**What happens**:

1. AI asks comprehensive questions
2. Larger context (50 messages)
3. Creates resume when 80% complete

### Customize for Tomorrow

Edit `src/lib/services/conversationConfig.ts`:

```typescript
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 100, // ← Change this
  maxBetaQuestions: 10, // ← Or change this
  enableSmartQuestions: true,
  completionThreshold: 50, // ← Or this
  mode: "beta",
};
```

No other code changes needed!

## Configuration Options

| Setting                | Purpose                  | Beta | Prod |
| ---------------------- | ------------------------ | ---- | ---- |
| `contextWindowSize`    | Messages AI remembers    | 20   | 50   |
| `maxBetaQuestions`     | Questions allowed        | 6    | ∞    |
| `enableSmartQuestions` | Priority field selection | ✓    | ✗    |
| `completionThreshold`  | % needed for resume      | 60%  | 80%  |
| `mode`                 | Operating mode           | beta | prod |

## Example Conversation

```
AI: "What's your full name?"
You: "Anil A"
[✓ Stored in context - won't be forgotten]

AI: "What's your email address?"
You: "anil@example.com"
[✓ 2 fields collected]

AI: "Tell me about your current role..."
You: "Senior Engineer at TechNova..."
[✓ 3 fields collected]

AI: "Key responsibilities?"
You: "Led automation platform development..."
[✓ 4 fields collected]

AI: "Educational background?"
You: "B.Tech Computer Science..."
[✓ 5 fields collected]

AI: "Technical skills?"
You: "Python, Java, System Design..."
[✓ 6 fields collected - MAX REACHED]

AI: "I have great information! Ready to create your resume?"
[No more questions asked]

→ Resume created successfully!
```

## Benefits

### For You (Right Now)

- ✅ Won't ask for name again (fixed!)
- ✅ Only 6 questions max (quick conversation)
- ✅ Smart order (asks priorities first)
- ✅ Remembers everything (20-message context)

### For Tomorrow

- ✅ Scale context to 100+ messages
- ✅ Change question limit anytime
- ✅ A/B test different configurations
- ✅ Optimize without code changes

## Implementation Details

### Files Changed

- ✅ **NEW**: `src/lib/services/conversationConfig.ts` - Configuration system
- ✅ **UPDATED**: `src/lib/services/resumePrompts.ts` - Uses configurable context
- ✅ **UPDATED**: `src/app/api/resume/generate/route.ts` - Uses config for decisions
- ✅ **IMPROVED**: `src/lib/services/resumeDataExtractor.ts` - Better name handling

### Tests

✅ All 41 tests passing

- conversationManager.test.ts (20 tests)
- resumeDataExtractor.test.ts (17 tests)
- resume/generate/route.test.ts (3 tests)
- aiGenerationService.test.ts (1 test)

### Build

✅ Production build succeeds

## Quick Reference

### Check Current Config

```typescript
import { getActiveConfig } from "@/lib/services/conversationConfig";
const config = getActiveConfig();
console.log(config.contextWindowSize); // 20
console.log(config.maxBetaQuestions); // 6
```

### Use Different Config

```typescript
import { PRODUCTION_CONFIG } from "@/lib/services/conversationConfig";
// Use production config explicitly
const config = PRODUCTION_CONFIG;
```

### Create Custom Config

```typescript
import { createCustomConfig } from "@/lib/services/conversationConfig";
const custom = createCustomConfig({
  contextWindowSize: 100,
  maxBetaQuestions: 10,
});
```

## Frequently Asked Questions

**Q: Why 6 questions in beta?**  
A: Balances information gathering with user experience. Enough to create a good resume, not overwhelming.

**Q: Can I change this later?**  
A: Yes! Edit one line in conversationConfig.ts. No recompilation needed after restart.

**Q: What's the context window size for?**  
A: Determines how many recent messages the AI sees. Prevents repeating questions by keeping conversation history.

**Q: How do I go to production mode?**  
A: Set `RESUME_MODE=production` environment variable.

**Q: Can I have unlimited questions?**  
A: Yes, in production mode. Or customize: set `maxBetaQuestions: Infinity` in config.

**Q: Will this affect existing users?**  
A: No, this is for the new conversation flow only.

## Documentation

- **CONVERSATION_CONFIG_GUIDE.md** - Complete guide with all options
- **CONVERSATION_CONFIG_QUICK_REF.md** - Quick reference card
- **CONFIG_UPDATE_SUMMARY.md** - What changed and why
- **CONFIG_IMPLEMENTATION_DETAILS.md** - How to use it

## Summary

✅ **Fixed**: AI won't ask for name again  
✅ **Optimized**: Only 6 questions in beta  
✅ **Smart**: Asks essential fields first  
✅ **Configurable**: Change settings without code  
✅ **Future-proof**: Scale to 100+ messages tomorrow  
✅ **No breaking changes**: All tests pass

**Start using it now**: `npm run dev`

---

For questions, see the documentation files or check `src/lib/services/conversationConfig.ts` for configuration options.
