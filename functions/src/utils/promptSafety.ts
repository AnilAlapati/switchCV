/**
 * Prompt Safety Utilities for Firebase Cloud Functions
 *
 * This module provides utilities for sanitizing user input before
 * including it in AI prompts. It helps prevent prompt injection attacks
 * and ensures safe prompt construction.
 *
 * @module functions/utils/promptSafety
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
    /}\s*{/,
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
 */
/**
 * Checks if the input string contains potential prompt injection patterns.
 * Includes advanced detection for Base64 and obfuscation attempts.
 *
 * @param input - The string to check for injection patterns
 * @returns true if injection patterns are detected, false otherwise
 */
export function containsPromptInjection(input: string): boolean {
    // 1. Check raw input against patterns
    if (PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input))) {
        return true;
    }

    // 2. Normalize and check again (handles some homoglyphs/unicode tricks)
    const normalized = input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    if (
        normalized !== input &&
        PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))
    ) {
        return true;
    }

    // 3. Remove zero-width characters and check again
    const stripped = input.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
    if (
        stripped !== input &&
        PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(stripped))
    ) {
        return true;
    }

    // 4. Check for Base64 encoded injections
    const potentialBase64 = input.match(/[A-Za-z0-9+/]{20,}={0,2}/g);
    if (potentialBase64) {
        for (const segment of potentialBase64) {
            try {
                const decoded = Buffer.from(segment, "base64").toString("utf-8");
                if (
                    /[\w\s\-]/.test(decoded) &&
                    PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(decoded))
                ) {
                    return true;
                }
            } catch {
                // Ignore invalid base64
            }
        }
    }

    return false;
}

/**
 * Sanitizes a string for safe inclusion in AI prompts.
 * Beyond basic validation, this adds additional safety measures:
 * - Removes zero-width characters
 * - Normalizes whitespace and unicode
 * - Truncates to safe length
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized string safe for prompt inclusion
 */
export function sanitizeForPrompt(input: string, maxLength = 500): string {
    return (
        input
            // Remove zero-width characters
            .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
            // Normalize unicode
            .normalize("NFKD")
            // Remove combining diacritical marks
            .replace(/[\u0300-\u036f]/g, "")
            // Remove any non-basic characters
            .replace(/[^\w\s\-']/g, "")
            // Collapse multiple spaces/newlines
            .replace(/\s+/g, " ")
            // Trim and limit length
            .trim()
            .slice(0, maxLength)
    );
}

// Security constants
export const QUERY_LIMITS = {
    MIN_LENGTH: 3,
    MAX_LENGTH: 500,
} as const;
