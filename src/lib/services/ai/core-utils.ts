import { logger } from "@/lib/logger";

export const AI_REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Helper to fetch with timeout
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Token counting utility (Heuristic)
export const TOKENS_PER_CHAR = 0.25; // ~4 chars = 1 token
export const MAX_TOKENS_GEMINI = 30000; // Safe buffer
export const MAX_TOKENS_DEFAULT = 4000; // Standard window

export function estimateTokenCount(text: string): number {
    return Math.ceil(text.length * TOKENS_PER_CHAR);
}

export async function validateContextWindow(
    prompt: string,
    modelName: string = "default",
): Promise<boolean> {
    const tokenCount = estimateTokenCount(prompt);
    let maxTokens = MAX_TOKENS_DEFAULT;

    if (modelName.toLowerCase().includes("gemini")) {
        maxTokens = MAX_TOKENS_GEMINI;
    } else if (modelName.toLowerCase().includes("gpt-4")) {
        maxTokens = 8000;
    } else if (modelName.toLowerCase().includes("llama")) {
        maxTokens = 8000;
    } else if (modelName.toLowerCase().includes("t5")) {
        maxTokens = 1000; // FLAN-T5 is small
    }

    if (tokenCount > maxTokens) {
        logger.warn(
            { tokenCount, maxTokens, modelName },
            "Context window limit exceeded",
        );
        throw new Error(
            `Prompt exceeds ${maxTokens} tokens (estimated: ${tokenCount}) for model ${modelName}`,
        );
    }

    // Log usage for monitoring
    logger.info({ tokenCount, modelName }, "Token usage estimated");
    return true;
}

// Global Safety Rate Limiter
const SAFETY_LIMIT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_SAFETY_LIMIT = process.env.NODE_ENV === "production" ? 1000 : 100;
const SAFETY_LIMIT_MAX_REQUESTS = Number(process.env.AI_GLOBAL_SAFETY_LIMIT) || DEFAULT_SAFETY_LIMIT;

let globalRequestCount = 0;
let globalWindowStart = Date.now();

export function checkGlobalSafetyLimit() {
    const now = Date.now();
    if (now - globalWindowStart > SAFETY_LIMIT_WINDOW_MS) {
        // Reset window
        globalWindowStart = now;
        globalRequestCount = 0;
    }

    globalRequestCount++;

    if (globalRequestCount > SAFETY_LIMIT_MAX_REQUESTS) {
        logger.error(
            { globalRequestCount, windowMs: SAFETY_LIMIT_WINDOW_MS },
            "⛔️ GLOBAL AI SAFETY STOP: Rate limit exceeded. Blocking API calls.",
        );
        throw new Error(
            "Global AI Safety Limit Exceeded: Potential infinite loop detected. Please wait 1 minute.",
        );
    }
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}
