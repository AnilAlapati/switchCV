import { AIModelConfig, UserTier } from "@/types/ai";

/**
 * All available models sorted by cost (cheapest first)
 */
export const AI_MODELS: AIModelConfig[] = [
    // CHEAP TIER - Gemini Flash
    {
        id: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash Lite",
        provider: "google",
        costPer1MTokens: 0.2, // ~Weighted avg of $0.10 in / $0.40 out
        quality: 7,
        speed: 9,
        maxTokens: 32768, // Flash Lite has distinct limits
        tier: "cheap",
    },
    // STANDARD TIER - GPT-4o-mini, Gemini Flash
    {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "openai",
        costPer1MTokens: 0.6,
        quality: 8,
        speed: 8,
        maxTokens: 16384,
        tier: "standard",
    },
    {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        provider: "google",
        costPer1MTokens: 1.0, // ~Weighted avg of $0.30 in / $2.50 out
        quality: 8,
        speed: 9,
        maxTokens: 32768,
        tier: "standard",
    },
    // PREMIUM TIER - Best models
    {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        costPer1MTokens: 10.0,
        quality: 10,
        speed: 7,
        maxTokens: 16384,
        tier: "premium",
    },
    {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        provider: "google",
        costPer1MTokens: 2.5,
        quality: 9,
        speed: 7,
        maxTokens: 32768,
        tier: "premium",
    },
    {
        id: "claude-3-5-haiku",
        name: "Claude 3.5 Haiku",
        provider: "anthropic",
        costPer1MTokens: 1.0,
        quality: 8,
        speed: 9,
        maxTokens: 8192,
        tier: "standard",
    },
    {
        id: "claude-3-5-sonnet",
        name: "Claude 3.5 Sonnet",
        provider: "anthropic",
        costPer1MTokens: 6.0,
        quality: 9,
        speed: 8,
        maxTokens: 8192,
        tier: "premium",
    },
    {
        id: "grok-beta",
        name: "Grok Beta",
        provider: "xai",
        costPer1MTokens: 5.0,
        quality: 9,
        speed: 8,
        maxTokens: 32768,
        tier: "premium",
    },
];

/**
 * Define which model tiers each user tier can access
 */
export const TIER_ACCESS: Record<UserTier, string[]> = {
    basic: ["free", "cheap"], // Only free and cheap models
    premium: ["free", "cheap", "standard"], // Up to standard models
    enterprise: ["free", "cheap", "standard", "premium"], // All models
};

/**
 * Define provider priority for each tier (try in this order)
 */
export const TIER_PROVIDER_PRIORITY: Record<UserTier, string[]> = {
    basic: ["google"], // Gemini Flash
    premium: ["google", "openai"], // Gemini, then GPT
    enterprise: ["openai", "google", "anthropic"], // Best first
};
