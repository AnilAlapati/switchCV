# Configuration Implementation Guide

## What Was Done

### 1. Created Configuration System

**File**: `src/lib/services/conversationConfig.ts`

A centralized configuration system with two modes:

- **Beta Mode** (current): 20-message context, max 6 questions, smart selection
- **Production Mode** (future): 50-message context, unlimited questions

### 2. Made Context Window Configurable

**Before**: Hardcoded 20 messages
**After**: Configurable via `ConversationConfig.contextWindowSize`

```typescript
// In resumePrompts.ts
const history = conversationHistory
  .slice(-activeConfig.contextWindowSize) // ← Uses config!
  .map((msg) => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
  .join("\n");
```

### 3. Added Smart Question Limiting (Beta Mode)

**Logic**:

- Counts conversation turns
- Limits to 6 questions maximum
- When max reached, AI offers: _"Shall I create your resume now?"_

```typescript
if (activeConfig.enableSmartQuestions && activeConfig.maxQuestionsInBetaMode) {
  const questionsAsked = conversationHistory.length;
  const remainingQuestions = Math.max(
    0,
    activeConfig.maxBetaQuestions - questionsAsked / 2
  );

  if (remainingQuestions > 0) {
    // Ask priority questions only
  } else {
    // Offer to create resume
  }
}
```

### 4. Enhanced Name Extraction

**File**: `src/lib/services/resumeDataExtractor.ts`

Now correctly extracts names with initials:

- "Anil A" ✅
- "Anil A." ✅
- "Anil K. Alapati" ✅

This fixes the original issue where the system asked for the name again.

## How to Use

### Current Usage (Beta)

```bash
npm run dev
```

Uses DEFAULT_CONFIG:

- Context: 20 messages
- Max Questions: 6
- Mode: beta

### Change Context Size

Edit `src/lib/services/conversationConfig.ts`:

```typescript
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 100, // ← Increase from 20
  maxBetaQuestions: 6,
  // ... rest of config
};
```

### Change Max Questions

```typescript
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 20,
  maxBetaQuestions: 10, // ← Increase from 6
  // ... rest of config
};
```

### Switch to Production Mode

```bash
RESUME_MODE=production npm start
```

Uses PRODUCTION_CONFIG:

- Context: 50 messages
- Max Questions: Infinity
- Mode: production

### Create Custom Config

```typescript
import { createCustomConfig } from "@/lib/services/conversationConfig";

const myConfig = createCustomConfig({
  contextWindowSize: 100,
  maxBetaQuestions: 10,
  enableSmartQuestions: true,
  completionThreshold: 50,
});
```

## Where Configuration Flows

```
conversationConfig.ts (source)
         ↓
resumePrompts.ts (buildConversationalPrompt)
         ↓
route.ts (resume/generate API)
         ↓
AI gets prompt with context window & smart question hints
```

### Example Flow

1. **Config Created**

   ```typescript
   const config = getActiveConfig(); // Gets DEFAULT_CONFIG
   ```

2. **Prompt Built**

   ```typescript
   const prompt = buildConversationalPrompt(
     message,
     conversationHistory,
     currentProgress,
     collectedData,
     config // ← Passed here
   );
   ```

3. **AI Uses Config**

   ```
   Context: "Last 20 messages: [...]"
   Smart Mode: "Ask ONE priority field. Remaining: 5 questions"
   Priority Fields: "name, email, summary, experience, education, skills"
   ```

4. **Decision Logic Uses Config**
   ```typescript
   const shouldCreateResume =
     progress.completenessPercentage >= config.completionThreshold;
   // (60% >= 60% = true for beta)
   ```

## Configuration Options Reference

```typescript
interface ConversationConfig {
  // How many messages AI remembers
  contextWindowSize: number;

  // Enable question limiting in beta
  maxQuestionsInBetaMode: boolean;

  // Maximum questions allowed in beta (e.g., 6)
  maxBetaQuestions: number;

  // Ask priority fields first instead of all at once
  enableSmartQuestions: boolean;

  // Order to ask questions
  priorityFields: string[];

  // Fields required for resume creation
  minimumRequiredFields: string[];

  // All possible fields to collect
  recommendedFields: string[];

  // Completion % needed to create resume
  completionThreshold: number;

  // Mode: 'beta' or 'production'
  mode: "beta" | "production";
}
```

## Tomorrow's Upgrade Path

When you want to increase to 100 messages:

```typescript
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 100, // ← Updated
  maxQuestionsInBetaMode: true,
  maxBetaQuestions: 10, // ← Updated (optional)
  enableSmartQuestions: true,
  priorityFields: [
    "name",
    "email",
    "summary",
    "experience",
    "education",
    "skills",
  ],
  minimumRequiredFields: ["name", "email", "summary"],
  recommendedFields: [
    "name",
    "email",
    "phone",
    "location",
    "summary",
    "experience",
    "education",
    "skills",
  ],
  completionThreshold: 50, // ← Updated (optional)
  mode: "beta",
};
```

No other code changes needed!

## Key Benefits

✅ **Prevents Repeated Questions**

- 20-message context keeps entire conversation history
- AI won't ask for name again (the issue you reported)

✅ **Reduces User Fatigue**

- Max 6 questions in beta keeps interaction short
- AI suggests creating resume after 6 Q&A turns

✅ **Smart Question Selection**

- Asks essential fields first: name → email → summary
- Then important fields: experience → education
- Then nice-to-have: skills

✅ **Easily Configurable**

- Change values without code recompilation
- One environment variable to switch modes
- Custom configs possible

✅ **Future-Proof**

- Tomorrow: increase to 100 messages, 10 questions
- Next release: unlimited questions
- A/B testing different configs possible

## Testing

All 41 tests pass:

```bash
✅ conversationManager.test.ts
✅ resumeDataExtractor.test.ts
✅ resume/generate/route.test.ts
✅ aiGenerationService.test.ts
```

Build succeeds without errors:

```bash
✅ npm run build
```

## Files Changed

### Core Configuration

- ✅ `src/lib/services/conversationConfig.ts` - NEW

### Updated to Use Config

- ✅ `src/lib/services/resumePrompts.ts`
- ✅ `src/app/api/resume/generate/route.ts`

### Improved Data Extraction

- ✅ `src/lib/services/resumeDataExtractor.ts`

### Documentation

- ✅ `docs/features/CONFIG_UPDATE_SUMMARY.md`
- ✅ `docs/features/CONVERSATION_CONFIG_GUIDE.md`
- ✅ `docs/features/CONVERSATION_CONFIG_QUICK_REF.md`

## Verify It Works

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000/create-resume
# Test conversation:
# 1. Enter name "Anil A" ← Won't ask again
# 2. Enter email
# 3-6. Answer 4-6 more questions
# → AI creates resume (no more questions!)

# Test with different config:
# Edit conversationConfig.ts, change maxBetaQuestions: 10
# Restart server
# Same flow but allows up to 10 questions
```

---

**Questions?** See `CONVERSATION_CONFIG_QUICK_REF.md` for quick answers.
