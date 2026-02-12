/**
 * Prompt Safety Utilities
 *
 * This module provides utilities for sanitizing user input before
 * including it in AI prompts. It helps prevent prompt injection attacks
 * and ensures safe prompt construction.
 *
 * @module promptSafety
 */

// ============================================================================
// PROMPT INJECTION DETECTION
// ============================================================================

/**
 * Patterns that may indicate prompt injection attempts.
 * These are checked against user input before it's included in AI prompts.
 */
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction overrides
  /ignore\s+(previous|all|above)/i,
  /disregard\s+(previous|all|above)/i,
  /forget\s+(previous|all|above)/i,
  // System prompt manipulation
  /system\s*:/i,
  /\[system\]/i,
  /<<\s*sys/i,
  /system\s+override/i,
  // Role manipulation
  /you\s+are\s+(now|a)/i,
  /act\s+as\s+/i,
  /pretend\s+(to\s+be|you)/i,
  // Delimiter injection
  /```\s*(json|system|prompt)/i,
  /---\s*\n/,
  // Common escape attempts
  /\}\s*\{/,
  /\\n\\n/,
  // Instruction injection
  /instead\s*,?\s*(do|say|output|return)/i,
  /new\s+instructions?:/i,
];

/**
 * Checks if the input string contains potential prompt injection patterns.
 *
 * @param input - The string to check for injection patterns
 * @returns true if injection patterns are detected, false otherwise
 *
 * @example
 * ```typescript
 * containsPromptInjection("Software Engineer") // false
 * containsPromptInjection("ignore previous instructions") // true
 * ```
 */
/**
 * Checks if the input string contains potential prompt injection patterns.
 * Includes advanced detection for Base64 and obfuscation attempts.
 *
 * @param input - The string to check for injection patterns
 * @returns true if injection patterns are detected, false otherwise
 *
 * @example
 * ```typescript
 * containsPromptInjection("Software Engineer") // false
 * containsPromptInjection("ignore previous instructions") // true
 * containsPromptInjection("aWdub3JlIHByZXZpb3Vz") // true (Base64 "ignore previous")
 * ```
 */
export function containsPromptInjection(input: string): boolean {
  // 1. Check raw input against patterns
  if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input))) {
    return true;
  }

  // 2. Normalize and check again (handles some homoglyphs/unicode tricks)
  // NFKD decomposition helps separate combined characters
  const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  if (
    normalized !== input &&
    PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))
  ) {
    return true;
  }

  // 3. Remove zero-width characters and check again
  // \u200B-\u200D: Zero-width space, joiner, non-joiner
  // \uFEFF: Zero-width no-break space
  // \u2060: Word joiner
  const stripped = input.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
  if (
    stripped !== input &&
    PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(stripped))
  ) {
    return true;
  }

  // 4. Check for Base64 encoded injections
  // Heuristic: continuous alphanum strings > 20 chars might be Base64
  const potentialBase64 = input.match(/[A-Za-z0-9+/]{20,}={0,2}/g);
  if (potentialBase64) {
    for (const segment of potentialBase64) {
      try {
        const decoded = Buffer.from(segment, "base64").toString("utf-8");
        // Only trigger if the decoded content is readable ASCII and suspicious
        if (
          /[\w\s\-]/.test(decoded) &&
          PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(decoded))
        ) {
          return true;
        }
      } catch {
        // Not valid base64 or conversion failed, ignore
      }
    }
  }

  return false;
}

/**
 * Sanitizes a string for safe inclusion in AI prompts.
 * Beyond basic validation, this adds additional safety measures:
 * - Removes zero-width characters (obfuscation vector)
 * - Normalizes whitespace and unicode
 * - Truncates to safe length
 * - Escapes any potentially dangerous sequences
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized string safe for prompt inclusion
 *
 * @example
 * ```typescript
 * sanitizeForPrompt("  Software   Engineer  ") // "Software Engineer"
 * sanitizeForPrompt("Vi\u200Betnam") // "Vietnam" (strips zero-width space)
 * ```
 */
export function sanitizeForPrompt(input: string, maxLength = 100): string {
  return (
    input
      // Remove zero-width characters first
      .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
      // Normalize unicode to ASCII equivalents where possible (NFKD decomposes)
      .normalize("NFKD")
      // Remove combining diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // Remove any remaining non-basic characters (allow alphanum, space, hyphen, apostrophe)
      .replace(/[^\w\s\-']/g, "")
      // Collapse multiple spaces/newlines
      .replace(/\s+/g, " ")
      // Trim and limit length
      .trim()
      .slice(0, maxLength)
  );
}
