# Conversational Resume Creation System

## Overview

Production-grade conversational AI system that guides users through creating professional resumes via natural dialogue. The system intelligently tracks progress, extracts structured data, and automatically generates resumes when sufficient information is gathered.

## Architecture

### Core Components

1. **ConversationManager** (`src/lib/services/conversationManager.ts`)

   - Tracks collected resume data
   - Calculates completion progress
   - Validates data completeness
   - Determines when resume can be created

2. **ResumeDataExtractor** (`src/lib/services/resumeDataExtractor.ts`)

   - Extracts structured data from natural language
   - Uses multiple strategies: JSON parsing, regex patterns, NLP
   - Merges data from multiple conversation turns
   - Provides confidence scoring

3. **Resume Prompts** (`src/lib/services/resumePrompts.ts`)

   - Structured AI prompts for guiding conversation
   - Completion detection logic
   - Progress-aware prompt engineering

4. **API Route** (`src/app/api/resume/generate/route.ts`)
   - Orchestrates the conversation flow
   - Manages session state
   - Creates resumes in Firestore
   - Assigns sequential numeric IDs

## Data Flow

```
User Input
    ↓
Extract Data (ResumeDataExtractor)
    ↓
Update Progress (ConversationManager)
    ↓
Build AI Prompt (resumePrompts)
    ↓
Generate AI Response
    ↓
Check Completion Status
    ↓
[If Ready] Create Resume → Return ID
[If Not] Continue Conversation
```

## API Endpoints

### POST `/api/resume/generate`

Conversational resume generation endpoint.

#### Request Body

```typescript
{
  message: string;                    // User's latest message
  conversationHistory: Message[];     // Previous conversation
  sessionData?: {                     // Optional session state
    collectedData: Partial<ResumeDataRequirements>;
    progress: ConversationProgress;
  };
}
```

#### Response (Continuing Conversation)

```typescript
{
  response: string; // AI's response
  model: string; // AI model used
  progress: number; // Completion percentage (0-100)
  sessionData: {
    collectedData: Partial<ResumeDataRequirements>;
    progress: ConversationProgress;
  }
}
```

#### Response (Resume Created)

```typescript
{
  response: string; // Completion message
  model: string;
  resumeId: string; // Numeric ID (e.g., "1", "2")
  numericId: number;
  created: true;
  progress: 100;
}
```

## Resume Data Structure

```typescript
interface ResumeDataRequirements {
  // Required Fields (minimum)
  name: string; // Full name
  email: string; // Valid email
  summary: string; // Professional summary

  // Recommended Fields
  phone?: string;
  location?: string;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  skills?: string[];
}

interface ExperienceEntry {
  title: string; // Job title
  company: string; // Company name
  duration: string; // Employment period
  description: string; // Role description
  achievements?: string[]; // Key accomplishments
}

interface EducationEntry {
  degree: string; // Degree type and field
  institution: string; // School name
  year: string; // Graduation year
  major?: string;
  gpa?: string;
}
```

## Completion Logic

### Minimum Requirements

Resume creation requires AT LEAST:

- Name
- Email (validated format)
- Summary

### Recommended Completion

System considers resume "ready" when:

- Minimum requirements met, OR
- 60%+ of recommended fields collected

### Validation

Before creating resume:

1. Email format validation
2. Non-empty arrays check
3. Minimum data present

## Data Extraction Strategies

### 1. JSON Markers (Highest Priority)

AI can return structured data:

```json
{
  "isComplete": true,
  "name": "John Doe",
  "email": "john@example.com",
  "summary": "Professional summary",
  "experience": [...],
  "education": [...],
  "skills": [...]
}
```

### 2. Pattern Matching

Regex patterns extract:

- Names: "My name is John Doe"
- Emails: email@example.com
- Phone: 555-123-4567
- Location: "based in San Francisco, CA"
- Skills: "Skills: JavaScript, React, Node.js"

### 3. Keyword Detection

Detects mentions of:

- Work experience keywords
- Education keywords
- Completion indicators

## Session Management

State is maintained via `sessionData` object:

```typescript
{
  collectedData: {
    name: "John Doe",
    email: "john@example.com",
    // ... accumulated data
  },
  progress: {
    completenessPercentage: 60,
    collectedFields: ["name", "email", "experience"],
    missingFields: ["education", "skills"],
    isReadyToCreate: true,
    hasMinimumData: true
  }
}
```

## UI Components

### ResumeProgress

Visual progress indicator showing:

- Completion percentage
- Collected fields (green badges)
- Missing fields (gray badges)
- Completion message

### CreateResumeInputForm

- Disabled during AI processing
- Shows appropriate placeholder messages
- Handles submission

### AILoadingState

Loading spinner and status messages during AI calls

## Resume ID Generation

Uses atomic Firestore counter for collision-free IDs:

1. Counter stored in `/system/resumeIdCounter`
2. Atomic increment operation
3. Sequential IDs: 1, 2, 3, ...
4. Supports ID recycling for deleted resumes

## Error Handling

### Graceful Degradation

1. JSON parsing fails → Pattern matching
2. Resume creation fails → Continue conversation
3. AI service down → Mock AI fallback (existing)

### Validation Errors

Returns validation feedback without creating resume:

- Invalid email format
- Missing required fields
- Empty arrays

## Testing

### Unit Tests

- `conversationManager.test.ts` - State management
- `resumeDataExtractor.test.ts` - Data extraction
- `resumePrompts.test.ts` - Prompt generation

### Integration Tests

API route tests covering:

- Full conversation flows
- Resume creation
- Error scenarios
- Session persistence

## Example Conversation Flow

```
1. User: "Hey there"
   AI: "Hello! What's your full name?"
   Progress: 0%

2. User: "I'm John Doe"
   AI: "Great! What email should we use?"
   Progress: 12.5%

3. User: "john@example.com"
   AI: "Perfect. Tell me about your work experience."
   Progress: 25%

4. User: "I'm a software engineer at Google"
   AI: "Excellent! What about your education?"
   Progress: 50%

5. User: "I have a CS degree from MIT"
   AI: "What are your key skills?"
   Progress: 75%

6. User: "JavaScript, React, Node.js, Python"
   AI: "Perfect! Creating your resume now..."
   Progress: 100%
   → Resume Created with ID: 1
```

## Performance Considerations

- **Token Efficiency**: Limits conversation history to last 6 messages
- **Caching**: AI model status cached for 1 hour
- **Atomic Operations**: Firestore atomic increments prevent ID collisions
- **Progressive Enhancement**: Shows progress immediately

## Security

- ✅ Firebase Auth required
- ✅ User ownership verification
- ✅ Input sanitization
- ✅ Email validation
- ✅ Rate limiting (future enhancement)

## Future Enhancements

1. **Resume Templates**: Choose visual design
2. **Edit Mode**: Refine created resumes
3. **Export Options**: PDF, DOCX, JSON
4. **Job Matching**: AI-powered job recommendations
5. **Multi-language**: i18n support
6. **Voice Input**: Speech-to-text integration

## Configuration

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your_key_here

# Optional
FIREBASE_PROJECT_ID=project_id
FIREBASE_CLIENT_EMAIL=service_account_email
FIREBASE_PRIVATE_KEY=private_key
```

### AI Model Selection

Default: `gemini-2.5-flash` (fast, accurate)
Fallback chain configured in `src/config/aiModels.ts`

## Monitoring

Key metrics to track:

- Resume creation success rate
- Average conversation length
- Data extraction accuracy
- User drop-off points
- API response times

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:

- GitHub Issues: [repository]/issues
- Documentation: /docs
- API Reference: /docs/api
