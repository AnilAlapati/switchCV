/**
 * AI Provider API Endpoints
 *
 * Centralized configuration for all external AI service URLs.
 * This allows easy updates if providers change their endpoints
 * and provides a single source of truth for API URLs.
 *
 * @module config/aiEndpoints
 */

/**
 * AI Provider API endpoint configurations
 */
export const AI_ENDPOINTS = {
    /**
     * Google Gemini API endpoints
     */
    GEMINI: {
        /** Get list of available models */
        MODELS: (apiKey: string) =>
            `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
        /** Generate content with a specific model */
        GENERATE: (modelName: string, apiKey: string) =>
            `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
        /** Generate embeddings with a specific model */
        EMBED: (model: string, apiKey: string) =>
            `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`,
    },

    /**
     * OpenAI API endpoints
     */
    OPENAI: {
        /** Chat completions endpoint */
        CHAT_COMPLETIONS: "https://api.openai.com/v1/chat/completions",
    },

    /**
     * Anthropic Claude API endpoints
     */
    ANTHROPIC: {
        /** Messages endpoint */
        MESSAGES: "https://api.anthropic.com/v1/messages",
    },

    /**
     * Groq API endpoints (OpenAI-compatible)
     */
    GROQ: {
        /** Chat completions endpoint */
        CHAT_COMPLETIONS: "https://api.groq.com/openai/v1/chat/completions",
    },

    /**
     * HuggingFace Inference API endpoints
     */
    HUGGINGFACE: {
        /** Model inference endpoint */
        MODELS: (modelPath: string) =>
            `https://router.huggingface.co/models/${modelPath}`,
    },

    /**
     * xAI (Grok) API endpoints
     */
    XAI: {
        /** Chat completions endpoint */
        CHAT_COMPLETIONS: "https://api.x.ai/v1/chat/completions",
    },
} as const;

/**
 * Default stop sequences for AI generation
 * These help prevent models from generating beyond expected boundaries
 */
export const DEFAULT_STOP_SEQUENCES = [
    "---",
    "##",
    "\n\n\n",
] as const;

/**
 * Type for accessing endpoint configuration
 */
export type AIEndpointsConfig = typeof AI_ENDPOINTS;
