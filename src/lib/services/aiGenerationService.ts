import { withRetry } from "@/lib/utils/retry";
import { logger } from "@/lib/logger";
import { AI_SERVICE } from "@/config/constants";

/**
 * Gemini API model response structure
 */
interface GeminiModel {
  name: string;
  supportedGenerationMethods?: string[];
}

interface GeminiModelsResponse {
  models?: GeminiModel[];
}

// Cache for available models (expires based on config)
let modelCache: {
  models: string[];
  timestamp: number;
} | null = null;
let inflightModelFetch: Promise<string[]> | null = null;

const {
  MODEL_CACHE_DURATION_MS: CACHE_DURATION,
  FALLBACK_MODEL,
  MAX_MODEL_REFRESH_ATTEMPTS: MAX_REMOTE_MODEL_REFRESHES,
  MODEL_PREFERENCES,
} = AI_SERVICE;

/**
 * Check if the model cache is valid
 */
function isCacheValid(): boolean {
  if (!modelCache) return false;
  const cacheAge = Date.now() - modelCache.timestamp;
  return cacheAge < CACHE_DURATION;
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
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  // Return cached models if still valid
  if (isCacheValid()) {
    return modelCache!.models;
  }

  if (!inflightModelFetch) {
    inflightModelFetch = (async () => {
      try {
        const response = await withRetry(() =>
          fetch(
            `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
          )
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data: GeminiModelsResponse = await response.json();
        const models =
          data.models
            ?.filter((model: GeminiModel) =>
              model.supportedGenerationMethods?.includes("generateContent")
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

async function loadModelSelection(apiKey: string): Promise<{
  models: string[];
  usingFallback: boolean;
}> {
  const models = await getAvailableGeminiModels(apiKey);
  if (models.length > 0) {
    return { models, usingFallback: false };
  }

  return {
    models: [...MODEL_PREFERENCES],
    usingFallback: true,
  };
}

/**
 * Select the best available model based on preferences
 */
function selectBestModel(availableModels: string[]): string {
  if (!availableModels.length) {
    return FALLBACK_MODEL;
  }

  // Try each preference in order
  for (const preferred of MODEL_PREFERENCES) {
    const match = availableModels.find((model) =>
      model.toLowerCase().includes(preferred.toLowerCase())
    );
    if (match) {
      logger.info({ model: match }, "Selected model");
      return match;
    }
  }

  // If no preference matched, use the first available model
  if (availableModels.length > 0) {
    logger.warn(
      { model: availableModels[0] },
      "Using fallback model from available list"
    );
    return availableModels[0];
  }

  // Last resort: try the current known model
  return FALLBACK_MODEL;
}

/**
 * Generate text using Gemini API
 */
async function generateWithGemini(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.9
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const attemptedModels = new Set<string>();
  let remoteRefreshes = 0;
  let lastError: Error | null = null;
  let selection = await loadModelSelection(apiKey);

  while (selection.models.length) {
    const candidatePool = selection.models.filter(
      (model) => !attemptedModels.has(model)
    );

    if (!candidatePool.length) {
      if (selection.usingFallback) {
        break;
      }

      if (remoteRefreshes >= MAX_REMOTE_MODEL_REFRESHES) {
        modelCache = null;
        selection = { models: [...MODEL_PREFERENCES], usingFallback: true };
        attemptedModels.clear();
        continue;
      }

      modelCache = null;
      attemptedModels.clear();
      remoteRefreshes += 1;
      selection = await loadModelSelection(apiKey);
      continue;
    }

    const modelName = selectBestModel(candidatePool);
    logger.info({ model: modelName }, "Using Gemini model");

    let response: Response;
    try {
      response = await withRetry(() =>
        fetch(
          `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
              },
            }),
          }
        )
      );
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(String(error ?? "Unknown Gemini error"));
      throw lastError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      lastError = new Error(
        `Gemini API error (${response.status}): ${errorText}`
      );

      if (response.status === 404) {
        attemptedModels.add(modelName);
        continue;
      }

      throw lastError;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No text generated from Gemini");
    }

    return {
      text: text.trim(),
      model: modelName,
    };
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Gemini API error: No supported models available");
}

/**
 * Generate text using HuggingFace API
 */
async function generateWithHuggingFace(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.9
): Promise<string> {
  const token = process.env.HUGGINGFACE_TOKEN;

  if (!token) {
    throw new Error("HuggingFace token not configured");
  }

  // HuggingFace Inference API - using text-generation endpoint
  const response = await withRetry(() =>
    fetch("https://router.huggingface.co/models/google/flan-t5-base", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature,
        },
      }),
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Handle different response formats
  if (Array.isArray(data)) {
    const text = data[0]?.generated_text;
    if (!text) {
      throw new Error("No text generated from HuggingFace");
    }
    return text.trim();
  }

  if (data.error) {
    // If model is loading, throw with helpful message
    if (data.error.includes("loading")) {
      throw new Error("Model is loading, please try again in a moment");
    }
    throw new Error(`HuggingFace error: ${data.error}`);
  }

  // Single object response
  if (data.generated_text) {
    return data.generated_text.trim();
  }

  throw new Error("Unexpected HuggingFace response format");
}

/**
 * Generate text with fallback to multiple providers
 */
export async function generateText(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.9
): Promise<{ text: string; model: string; provider: string }> {
  const errors: Record<string, string> = {};

  // Try Gemini first
  try {
    logger.info("Trying Gemini API...");
    const result = await generateWithGemini(prompt, maxTokens, temperature);
    logger.info({ model: result.model }, "Gemini API success");
    return {
      text: result.text,
      model: result.model,
      provider: "google",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.gemini = errorMsg;
    logger.error({ err: error }, "Gemini failed");
  }

  // Try HuggingFace as fallback
  try {
    logger.info("Trying HuggingFace API...");
    const text = await generateWithHuggingFace(prompt, maxTokens, temperature);
    logger.info("HuggingFace API success");
    return {
      text,
      model: "FLAN-T5 Base",
      provider: "huggingface",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.huggingface = errorMsg;
    logger.error({ err: error }, "HuggingFace failed");
  }

  // Both failed
  throw new Error(`All AI providers failed: ${JSON.stringify(errors)}`);
}
