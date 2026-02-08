import { logger } from "@/lib/logger";
import { getConstants } from "@/lib/getSystemConfig";
import { withRetry } from "@/lib/utils/retry";
import { fetchWithTimeout } from "./core-utils";
import { AI_ENDPOINTS } from "@/config/aiEndpoints";

/**
 * Gemini API model response structure
 */
export interface GeminiModel {
    name: string;
    supportedGenerationMethods?: string[];
}

export interface GeminiModelsResponse {
    models?: GeminiModel[];
}

// Cache for available models (expires based on config)
let modelCache: {
    models: string[];
    timestamp: number;
} | null = null;
let inflightModelFetch: Promise<string[]> | null = null;

// Cache for AI constants
let aiConstants: Awaited<ReturnType<typeof getConstants>>["AI_SERVICE"] | null = null;

export async function getAIConstants() {
    if (!aiConstants) {
        const constants = await getConstants();
        aiConstants = constants.AI_SERVICE;
    }
    return aiConstants;
}

/**
 * Check if the model cache is valid
 */
export async function isCacheValid(): Promise<boolean> {
    if (!modelCache) return false;
    const cacheAge = Date.now() - modelCache.timestamp;
    const constants = await getAIConstants();
    return cacheAge < constants.MODEL_CACHE_DURATION_MS;
}

/**
 * Invalidate the model cache (useful for testing or forced refresh)
 */
export function invalidateModelCache(): void {
    modelCache = null;
    inflightModelFetch = null;
    logger.info("Model cache invalidated");
}

/**
 * Get cache status for monitoring
 */
export function getCacheStatus(): {
    isCached: boolean;
    cacheAge: number | null;
    modelsCount: number;
} {
    if (!modelCache) {
        return { isCached: false, cacheAge: null, modelsCount: 0 };
    }
    return {
        isCached: true,
        cacheAge: Date.now() - modelCache.timestamp,
        modelsCount: modelCache.models.length,
    };
}

/**
 * Fetch and cache available Gemini models
 */
export async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
    // Return cached models if still valid
    if (await isCacheValid()) {
        return modelCache!.models;
    }

    if (!inflightModelFetch) {
        inflightModelFetch = (async () => {
            try {
                const response = await withRetry(() =>
                    fetchWithTimeout(AI_ENDPOINTS.GEMINI.MODELS(apiKey)),
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch models: ${response.status}`);
                }

                const data: GeminiModelsResponse = await response.json();
                const models =
                    data.models
                        ?.filter((model: GeminiModel) =>
                            model.supportedGenerationMethods?.includes("generateContent"),
                        )
                        .map((model: GeminiModel) => model.name.replace("models/", "")) ||
                    [];

                modelCache = {
                    models,
                    timestamp: Date.now(),
                };

                logger.info({ count: models.length }, "Cached available Gemini models");
                return models;
            } catch (error) {
                logger.error({ err: error }, "Failed to fetch Gemini models");
                return [];
            } finally {
                inflightModelFetch = null;
            }
        })();
    }

    return inflightModelFetch;
}

export async function loadModelSelection(apiKey: string): Promise<{
    models: string[];
    usingFallback: boolean;
}> {
    const models = await getAvailableGeminiModels(apiKey);
    if (models.length > 0) {
        return { models, usingFallback: false };
    }

    const constants = await getAIConstants();
    return {
        models: [...constants.MODEL_PREFERENCES],
        usingFallback: true,
    };
}

/**
 * Select the best available model based on preferences
 */
export async function selectBestModel(availableModels: string[]): Promise<string> {
    const constants = await getAIConstants();

    // Try each preference in order
    for (const preferred of constants.MODEL_PREFERENCES) {
        const match = availableModels.find((model) =>
            model.toLowerCase().includes(preferred.toLowerCase()),
        );
        if (match) {
            logger.info({ model: match }, "Selected model");
            return match;
        }
    }

    // If no preference matched, use the first available model
    logger.warn(
        { model: availableModels[0] },
        "Using fallback model from available list",
    );
    return availableModels[0];
}

// Export for manipulation if needed (e.g. forced reset)
export function resetModelCache() {
    modelCache = null;
}
