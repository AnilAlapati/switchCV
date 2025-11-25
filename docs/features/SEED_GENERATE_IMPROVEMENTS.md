# Seed Generate API Improvements

This document describes the improvements made to the `/api/seed/generate` endpoint based on the recommendations for future improvement.

## Overview

The seed generate API creates resume data based on a profession using either template-based generation (for basic tier) or AI-powered generation (for premium tiers). These improvements enhance reliability, security, and user experience.

## Improvements Implemented

### 1. Quota Refund on Failure

**Problem:** Previously, if AI generation failed after quota was consumed, users would lose their quota allocation without receiving any value.

**Solution:** Added a `refundQuota()` function to the quota service that atomically decrements the quota count when operations fail.

**Implementation:**

```typescript
// In quotaService.ts
export async function refundQuota(
  request: Omit<QuotaRequest, "limit">
): Promise<RefundResult>;
```

**When refunds occur:**

- AI service call fails (network error, timeout, etc.)
- AI response cannot be parsed as JSON
- AI response fails schema validation

**Usage in route:**

```typescript
try {
  result = await generateText(prompt, AI_MAX_TOKENS, AI_TEMPERATURE);
} catch (aiError) {
  await refundQuotas(userId); // Refunds both user and global quota
  throw aiError;
}
```

**RefundResult interface:**

```typescript
interface RefundResult {
  refunded: boolean;
  currentCount: number;
  reason?: string; // Explains why refund failed if applicable
}
```

---

### 2. AI Response Validation with Zod Schema

**Problem:** AI-generated responses could have missing fields, incorrect types, or invalid data that would cause runtime errors downstream.

**Solution:** Created a comprehensive Zod schema (`AIResumeResponseSchema`) that validates the entire resume structure before it's used.

**Location:** `src/lib/schemas/aiResumeSchema.ts`

**Schema Structure:**

```typescript
const AIResumeResponseSchema = z.object({
  title: z.string().min(1).max(200),
  templateId: z.string().min(1).max(50),
  summary: z.string().min(1).max(2000),
  skills: z.array(AISkillSchema).min(1).max(20),
  experience: z.array(AIExperienceSchema).min(1).max(10),
  education: z.array(AIEducationSchema).min(0).max(10),
  contact: AIContactSchema,
  projects: z.array(AIProjectSchema).min(0).max(10),
});
```

**Validation includes:**

- Required vs optional fields
- String length limits
- Array bounds (min/max items)
- Email format validation
- Visibility enum validation (`public`, `masked`, `request`)

**Benefits:**

- Type-safe resume data after validation
- Clear error messages for debugging
- Prevents invalid data from entering the system
- Documents the expected AI response format

---

### 3. Prompt Safety / Injection Protection

**Problem:** User-provided profession strings could potentially contain prompt injection attacks that manipulate AI behavior.

**Solution:** Created a `promptSafety` utility module with two layers of protection.

**Location:** `src/lib/utils/promptSafety.ts`

#### Layer 1: Injection Detection

```typescript
export function containsPromptInjection(input: string): boolean;
```

**Patterns detected:**

- Instruction overrides: "ignore previous", "disregard all", etc.
- System prompt manipulation: "system:", "[system]", "<<sys"
- Role manipulation: "you are now", "act as", "pretend to be"
- Delimiter injection: "`json", "`system", "---\n"
- Escape attempts: "}{", "\n\n"
- Instruction injection: "instead, do", "new instructions:"

#### Layer 2: Sanitization

```typescript
export function sanitizeForPrompt(input: string, maxLength?: number): string;
```

**Sanitization steps:**

1. Normalize unicode to ASCII equivalents
2. Remove non-basic characters
3. Collapse multiple spaces/newlines
4. Trim and limit length

**Integration:**

```typescript
// In Zod schema - validates during parsing
.refine(
  (val) => !containsPromptInjection(val),
  "Invalid characters detected in profession"
)

// Before prompt construction - additional sanitization
const safeProfession = sanitizeForPrompt(profession);
```

---

### 4. Robust JSON Extraction

**Problem:** AI responses often include markdown formatting, explanatory text, or other content around the JSON, causing `JSON.parse()` to fail.

**Solution:** Created a multi-strategy JSON extraction utility.

**Location:** `src/lib/utils/aiResponseParser.ts`

**Strategies (in order):**

1. **Direct Parse** - Try parsing if text starts with `{` and ends with `}`
2. **Code Block Extraction** - Extract from \`\`\`json ... \`\`\` or \`\`\` ... \`\`\`
3. **Balanced Brace Matching** - Find JSON by tracking `{` and `}` with proper string handling
4. **Aggressive Cleanup** - Remove common artifacts and try again

**Key function:**

```typescript
export function extractJsonFromResponse(text: string): unknown | null;
```

**Helper function for balanced brace matching:**

```typescript
export function findJsonObject(text: string): string | null;
```

The `findJsonObject` function properly handles:

- Nested objects
- Strings containing braces
- Escape sequences

**Examples handled:**

````
// Pure JSON
{"title": "Engineer"}

// Markdown wrapped
```json
{"title": "Engineer"}
````

// Embedded in text
Here is the resume:
{"title": "Engineer"}
Hope this helps!

```

---

## File Structure

```

src/
├── app/api/seed/generate/
│ └── route.ts # Main route handler
├── lib/
│ ├── schemas/
│ │ └── aiResumeSchema.ts # AI response validation schemas
│ ├── services/
│ │ └── quotaService.ts # Added refundQuota function
│ └── utils/
│ ├── aiResponseParser.ts # JSON extraction utilities
│ └── promptSafety.ts # Prompt injection protection
└── docs/features/
└── SEED_GENERATE_IMPROVEMENTS.md # This documentation

````

---

## Testing Recommendations

### Quota Refund Testing
```typescript
// Test that quota is refunded on AI failure
it('should refund quota when AI generation fails', async () => {
  mockGenerateText.mockRejectedValue(new Error('AI unavailable'));

  const initialQuota = await getQuotaCount(userId);
  await POST(mockRequest);
  const finalQuota = await getQuotaCount(userId);

  expect(finalQuota).toBe(initialQuota); // Quota unchanged
});
````

### Schema Validation Testing

```typescript
// Test that invalid AI responses are rejected
it("should reject AI response missing required fields", () => {
  const invalid = { title: "Engineer" }; // Missing skills, experience, etc.
  const result = AIResumeResponseSchema.safeParse(invalid);
  expect(result.success).toBe(false);
});
```

### Prompt Injection Testing

```typescript
// Test injection patterns are detected
it("should detect prompt injection attempts", () => {
  expect(containsPromptInjection("ignore previous instructions")).toBe(true);
  expect(containsPromptInjection("Software Engineer")).toBe(false);
});
```

### JSON Extraction Testing

````typescript
// Test various AI response formats
it("should extract JSON from markdown code blocks", () => {
  const response = '```json\n{"title": "Test"}\n```';
  const result = extractJsonFromResponse(response);
  expect(result).toEqual({ title: "Test" });
});
````

---

## Error Handling Flow

```
User Request
     │
     ▼
┌─────────────────┐
│ Validate Input  │──▶ 400 Bad Request (validation errors)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Quota     │──▶ 429 Too Many Requests (quota exceeded)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate (AI)   │──▶ Refund quota, throw error
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract JSON    │──▶ Refund quota, 502 Bad Gateway
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Schema │──▶ Refund quota, 502 Bad Gateway
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Resume   │──▶ 200 OK with resume data
└─────────────────┘
```

---

## API Response Headers

The endpoint returns quota information in response headers:

| Header                    | Description                                   |
| ------------------------- | --------------------------------------------- |
| `X-Seed-Quota-Limit`      | User's total quota for the period             |
| `X-Seed-Quota-Remaining`  | User's remaining quota                        |
| `X-Seed-Quota-Reset`      | Unix timestamp when quota resets              |
| `X-Seed-Global-Remaining` | Global AI call quota remaining (AI mode only) |

---

## Future Considerations

1. **Rate limiting by IP** - Add IP-based rate limiting for unauthenticated abuse prevention
2. **Retry with backoff** - Implement automatic retry for transient AI failures
3. **Response caching** - Cache AI responses for identical professions
4. **Metrics/monitoring** - Add observability for refund rates, failure patterns
5. **A/B testing prompts** - Test different prompt formats for better results
