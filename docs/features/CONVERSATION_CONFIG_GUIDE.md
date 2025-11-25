# Conversation Configuration Guide

## Overview

The conversation flow is now **fully configurable**, allowing you to switch between different modes and adjust settings without code changes.

## Configuration Files

### `src/lib/services/conversationConfig.ts`

Contains all configuration settings for the conversational resume building process.

## Modes

### Beta Mode (Default)

- **Context Window**: 20 messages (recent conversation history)
- **Max Questions**: 6 questions max
- **Smart Questions**: Enabled - asks only critical fields first
- **Priority Fields**: name → email → summary → experience → education → skills
- **Completion Threshold**: 60% (enough data to create resume)

**Use When**: Testing in beta, want minimal user fatigue, iterative feedback

```typescript
const config = DEFAULT_CONFIG; // or getActiveConfig()
// contextWindowSize: 20
// maxBetaQuestions: 6
// enableSmartQuestions: true
// completionThreshold: 60
```

### Production Mode

- **Context Window**: 50 messages (comprehensive history)
- **Max Questions**: Unlimited
- **Smart Questions**: Disabled - gathers all information
- **Completion Threshold**: 80% (more comprehensive)

**Use When**: Production deployment, want complete resumes

```typescript
// Set RESUME_MODE=production or NODE_ENV=production
const config = PRODUCTION_CONFIG;
// contextWindowSize: 50
// maxBetaQuestions: Infinity
// enableSmartQuestions: false
// completionThreshold: 80
```

## How to Switch Modes

### Option 1: Environment Variable

```bash
# Beta (default)
RESUME_MODE=beta npm run dev

# Production
RESUME_MODE=production npm run build
RESUME_MODE=production npm start
```

### Option 2: Programmatically

```typescript
import {
  getActiveConfig,
  DEFAULT_CONFIG,
  PRODUCTION_CONFIG,
} from "@/lib/services/conversationConfig";

// Get active config (checks RESUME_MODE env var)
const config = getActiveConfig();

// Or use specific config
const betaConfig = DEFAULT_CONFIG;
const prodConfig = PRODUCTION_CONFIG;
```

### Option 3: Custom Configuration

```typescript
import { createCustomConfig } from "@/lib/services/conversationConfig";

const customConfig = createCustomConfig({
  contextWindowSize: 100, // Increase to remember more
  maxBetaQuestions: 3, // Ask fewer questions
  enableSmartQuestions: true,
  completionThreshold: 50, // Lower threshold for faster completion
});
```

## Configuration Options Explained

| Option                   | Beta | Production | Purpose                                   |
| ------------------------ | ---- | ---------- | ----------------------------------------- |
| `contextWindowSize`      | 20   | 50         | How many messages to retain in AI context |
| `maxQuestionsInBetaMode` | true | false      | Enable question limiting                  |
| `maxBetaQuestions`       | 6    | ∞          | Max questions allowed in beta             |
| `enableSmartQuestions`   | true | false      | Ask priority fields first                 |
| `completionThreshold`    | 60%  | 80%        | Data needed to create resume              |

## Smart Question Selection

When `enableSmartQuestions` is enabled (beta mode), the AI:

1. **Asks priority fields first**: name → email → summary → experience → education → skills
2. **Limits questions**: Maximum of 6 questions before offering resume creation
3. **Tracks questions**: Monitors conversation history to avoid repeating questions
4. **Offers completion**: When max questions reached, asks: _"Shall I create your resume now?"_

### Example Flow (Beta Mode)

```
User: "I'm ready to create a resume"
AI: "Great! What's your full name?" (Q1)

User: "Anil A"
AI: "What's your email address?" (Q2)

User: "anil@example.com"
AI: "Tell me about your professional background..." (Q3)

User: "10+ years in software engineering"
AI: "Can you share a job title and company?" (Q4)

User: "Senior Engineer at TechCorp (2020-Present)"
AI: "What are your key skills?" (Q5)

User: "Python, Java, System Design"
AI: "Any formal education you'd like to include?" (Q6)

User: "B.Tech Computer Science"
AI: "I have good information now! Shall I create your resume?"
    → Creates resume without asking more questions
```

## How It Works

### Context Window

The AI retains the last N messages from the conversation:

- **Beta (20)**: Remembers last ~10 exchanges
- **Production (50)**: Remembers ~25 exchanges

This prevents questions being repeated (like asking for name again).

### Question Limiting

In beta mode, the system:

- Counts conversation messages
- Limits to 6 AI questions maximum
- Tracks which fields are collected
- Offers resume creation when limit reached OR all essential data is gathered

### Smart Field Selection

Priority order for asking questions:

1. **name** - Essential, always ask first
2. **email** - Essential, ask second
3. **summary** - Essential, foundational
4. **experience** - Important, work history
5. **education** - Important, background
6. **skills** - Nice to have, completes profile

## Configuration in Code

**Route Handler** (`src/app/api/resume/generate/route.ts`):

```typescript
const config = getActiveConfig();

const prompt = buildConversationalPrompt(
  message,
  conversationHistory,
  currentProgress,
  conversationManager.getData(),
  config // ← Pass config to AI prompt builder
);

// Decision logic uses config thresholds
const shouldCreateResume =
  progress.completenessPercentage >= config.completionThreshold;
```

**Prompt Builder** (`src/lib/services/resumePrompts.ts`):

```typescript
export function buildConversationalPrompt(..., config?) {
  const activeConfig = config || getActiveConfig();

  // Use context window size from config
  const history = conversationHistory
    .slice(-activeConfig.contextWindowSize)

  // Use smart question logic in beta
  if (activeConfig.enableSmartQuestions) {
    // Limit questions, suggest completion
  }
}
```

## Future Customization

To change behavior for tomorrow's release, simply update environment variables:

```bash
# Increase context to 100 messages and max questions to 10
CONVERSATION_CONTEXT_SIZE=100
MAX_QUESTIONS=10
RESUME_MODE=custom npm run dev
```

Or create a new config file:

```typescript
export const CUSTOM_CONFIG: ConversationConfig = {
  contextWindowSize: 100,
  maxBetaQuestions: 10,
  enableSmartQuestions: true,
  completionThreshold: 50,
  // ... rest of config
};
```

## Summary

✅ **Context window is configurable**: 20 (beta) → 100+ (future)
✅ **Question limiting is configurable**: 6 (beta) → unlimited (production)
✅ **Smart questions prevent repeats**: Tracks what's been asked
✅ **Easy to switch modes**: Just set environment variable
✅ **Tomorrow-proof**: Add new configs without code changes
