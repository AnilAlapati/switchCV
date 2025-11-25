/**
 * AI Response Parsing Utilities
 *
 * This module provides utilities for safely extracting and validating
 * JSON responses from AI-generated content.
 *
 * @module aiResponseParser
 */

// ============================================================================
// JSON EXTRACTION
// ============================================================================

/**
 * Extracts JSON from AI response text using multiple strategies.
 * AI responses often include markdown formatting, explanatory text,
 * or other content around the JSON. This function handles common cases:
 *
 * 1. Pure JSON response (ideal case)
 * 2. JSON wrapped in markdown code blocks (```json ... ```)
 * 3. JSON embedded in explanatory text
 *
 * @param text - Raw text from AI response
 * @returns Parsed JSON object or null if extraction fails
 *
 * @example
 * ```typescript
 * // Handles markdown-wrapped JSON
 * extractJsonFromResponse('```json\n{"title": "Engineer"}\n```')
 *
 * // Handles embedded JSON
 * extractJsonFromResponse('Here is the resume:\n{"title": "Engineer"}')
 * ```
 */
export function extractJsonFromResponse(text: string): unknown | null {
  // Strategy 1: Try direct parse (cleanest case)
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue to other strategies
    }
  }

  // Strategy 2: Extract from markdown code blocks
  // Matches ```json ... ``` or ``` ... ``` patterns
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to other strategies
    }
  }

  // Strategy 3: Find JSON object boundaries using balanced brace matching
  const jsonMatch = findJsonObject(text);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch);
    } catch {
      // Continue to fallback
    }
  }

  // Strategy 4: Fallback - aggressive cleanup
  // Remove common AI response artifacts
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/^[^{]*/, "") // Remove text before first {
    .replace(/[^}]*$/, "") // Remove text after last }
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Finds a complete JSON object in text by matching balanced braces.
 * This handles cases where the AI includes extra text before/after the JSON.
 *
 * @param text - Text potentially containing a JSON object
 * @returns The extracted JSON string or null if not found
 */
export function findJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}
