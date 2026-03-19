/**
 * Shared Billing Constants and Logic
 * Standardized across Next.js and Cloud Functions
 */

export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    // Gemini 2.5 (current active models)
    "gemini-2.5-flash": { input: 0.00015, output: 0.0006 },
    "gemini-2.5-flash-lite": { input: 0.000075, output: 0.0003 },
    "gemini-2.5-pro": { input: 0.00125, output: 0.005 },

    // Gemini 3.1 — replacement for discontinued 2.0 Flash family (GA June 2026)
    "gemini-3.1-flash-lite-preview": { input: 0.000075, output: 0.0003 },

    // Gemini 2.0 — DISCONTINUED June 1 2026 (kept for historical billing records)
    "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },

    // Gemini 1.5 (legacy)
    "gemini-1.5-flash": { input: 0.00035, output: 0.00105 },
    "gemini-1.5-pro": { input: 0.0035, output: 0.0105 },

    // OpenAI
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },

    // Default fallback
    default: { input: 0.001, output: 0.002 },
  };

export const BUDGET_CAPS = {
  basic: 0.1,
  premium: 30.0,
  enterprise: 70.0,
} as const;

export const BILLING_CONFIG = {
  NUM_SHARDS: 10,
  SHARD_COLLECTION: "system/billing/shards",
  DASHBOARD_COLLECTION: "system/billing/dashboard",
  COLLECTION: "billing",
} as const;

/**
 * Calculate exact cost for a request
 */
export function calculateAicost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["default"];
  return (
    (inputTokens / 1000) * pricing.input +
    (outputTokens / 1000) * pricing.output
  );
}
