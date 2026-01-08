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
export function containsPromptInjection(input: string): boolean {
    return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitizes a string for safe inclusion in AI prompts.
 * Beyond basic validation, this adds additional safety measures:
 * - Removes any remaining special characters
 * - Normalizes whitespace
 * - Truncates to safe length
 *
 * @param input - The string to sanitize
 * @param maxLength - Maximum allowed length (default: 500)
 * @returns Sanitized string safe for prompt inclusion
 */
export function sanitizeForPrompt(input: string, maxLength = 500): string {
    return (
        input
            // Normalize unicode to ASCII equivalents where possible
            .normalize("NFKD")
            // Remove any non-basic characters that might have slipped through
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
