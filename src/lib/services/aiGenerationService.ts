import { withRetry } from "@/lib/utils/retry";
import { logger } from "@/lib/logger";
import { getConstants } from "@/lib/getSystemConfig";

const AI_REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {}
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

// Cache for AI constants
let aiConstants: Awaited<ReturnType<typeof getConstants>>["AI_SERVICE"] | null =
  null;

async function getAIConstants() {
  if (!aiConstants) {
    const constants = await getConstants();
    aiConstants = constants.AI_SERVICE;
  }
  return aiConstants;
}

/**
 * Check if the model cache is valid
 */
async function isCacheValid(): Promise<boolean> {
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
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  // Return cached models if still valid
  if (await isCacheValid()) {
    return modelCache!.models;
  }

  if (!inflightModelFetch) {
    inflightModelFetch = (async () => {
      try {
        const response = await withRetry(() =>
          fetchWithTimeout(
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

  const constants = await getAIConstants();
  return {
    models: [...constants.MODEL_PREFERENCES],
    usingFallback: true,
  };
}

/**
 * Select the best available model based on preferences
 */
async function selectBestModel(availableModels: string[]): Promise<string> {
  const constants = await getAIConstants();

  if (!availableModels.length) {
    return constants.FALLBACK_MODEL;
  }

  // Try each preference in order
  for (const preferred of constants.MODEL_PREFERENCES) {
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
  return constants.FALLBACK_MODEL;
}

/**
 * Generate text using Gemini API
 */
async function generateWithGemini(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.9,
  model?: string
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key not configured");
  }

  const attemptedModels = new Set<string>();
  let remoteRefreshes = 0;
  let lastError: Error | null = null;
  let selection = await loadModelSelection(apiKey);

  // If a specific model is requested, override the selection logic
  if (model) {
    logger.info({ model }, "Using requested Gemini model override");
    // We construct a single-item pool
    selection = {
      models: [model],
      usingFallback: false
    };
  }

  while (selection.models.length) {
    const candidatePool = selection.models.filter(
      (m) => !attemptedModels.has(m)
    );

    if (!candidatePool.length) {
      if (selection.usingFallback) {
        break;
      }

      const constants = await getAIConstants();
      if (remoteRefreshes >= constants.MAX_MODEL_REFRESH_ATTEMPTS) {
        modelCache = null;
        selection = {
          models: [...constants.MODEL_PREFERENCES],
          usingFallback: true,
        };
        attemptedModels.clear();
        continue;
      }

      modelCache = null;
      attemptedModels.clear();
      remoteRefreshes += 1;
      selection = await loadModelSelection(apiKey);
      continue;
    }

    const modelName = model || await selectBestModel(candidatePool);
    logger.info({ model: modelName }, "Using Gemini model");

    let response: Response;
    try {
      response = await withRetry(() =>
        fetchWithTimeout(
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
 * Generate text using OpenAI API
 */
async function generateWithOpenAI(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.9
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const model = "gpt-4o-mini"; // Fast and cheap

  const response = await withRetry(() =>
    fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No text generated from OpenAI");
  }

  return {
    text: text.trim(),
    model,
  };
}

/**
 * Generate text using Groq API (fast inference)
 */
async function generateWithGroq(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.9
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const model = "llama-3.3-70b-versatile"; // Fast and free tier available

  const response = await withRetry(() =>
    fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No text generated from Groq");
  }

  return {
    text: text.trim(),
    model,
  };
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
    fetchWithTimeout(
      "https://router.huggingface.co/models/google/flan-t5-base",
      {
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
      }
    )
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

// Circuit Breaker System
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold = 3;
  private readonly timeout = 60000; // 1 minute open state

  isOpen(): boolean {
    if (this.failures >= this.threshold) {
      const now = Date.now();
      if (now - this.lastFailure > this.timeout) {
        // Half-open: try once
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }
}

const breakers = {
  google: new CircuitBreaker(),
  openai: new CircuitBreaker(),
  groq: new CircuitBreaker(),
  huggingface: new CircuitBreaker(),
};

/**
 * Generate text with fallback to multiple providers
 */
export async function generateText(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.9,
  model?: string
): Promise<{ text: string; model: string; provider: string }> {
  const errors: Record<string, string> = {};

  // Try Gemini first
  if (!breakers.google.isOpen()) {
    try {
      logger.info("Trying Gemini API...");
      const result = await generateWithGemini(prompt, maxTokens, temperature, model);
      logger.info({ model: result.model }, "Gemini API success");
      breakers.google.recordSuccess();
      return {
        text: result.text,
        model: result.model,
        provider: "google",
      };
    } catch (error) {
      breakers.google.recordFailure();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.gemini = errorMsg;
      logger.error({ err: error }, "Gemini failed");
    }
  } else {
    logger.warn("Gemini Circuit Breaker OPEN - Skipping");
  }

  // Try OpenAI as second fallback
  if (!breakers.openai.isOpen()) {
    try {
      logger.info("Trying OpenAI API...");
      const result = await generateWithOpenAI(prompt, maxTokens, temperature);
      logger.info({ model: result.model }, "OpenAI API success");
      breakers.openai.recordSuccess();
      return {
        text: result.text,
        model: result.model,
        provider: "openai",
      };
    } catch (error) {
      breakers.openai.recordFailure();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.openai = errorMsg;
      logger.error({ err: error }, "OpenAI failed");
    }
  } else {
    logger.warn("OpenAI Circuit Breaker OPEN - Skipping");
  }


  // Try Groq as third fallback (fast & free)
  if (!breakers.groq.isOpen()) {
    try {
      logger.info("Trying Groq API...");
      const result = await generateWithGroq(prompt, maxTokens, temperature);
      logger.info({ model: result.model }, "Groq API success");
      breakers.groq.recordSuccess();
      return {
        text: result.text,
        model: result.model,
        provider: "groq",
      };
    } catch (error) {
      breakers.groq.recordFailure();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.groq = errorMsg;
      logger.error({ err: error }, "Groq failed");
    }
  } else {
    logger.warn("Groq Circuit Breaker OPEN - Skipping");
  }

  // Try HuggingFace as last fallback
  if (!breakers.huggingface.isOpen()) {
    try {
      logger.info("Trying HuggingFace API...");
      const text = await generateWithHuggingFace(prompt, maxTokens, temperature);
      logger.info("HuggingFace API success");
      breakers.huggingface.recordSuccess();
      return {
        text,
        model: "FLAN-T5 Base",
        provider: "huggingface",
      };
    } catch (error) {
      breakers.huggingface.recordFailure();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.huggingface = errorMsg;
      logger.error({ err: error }, "HuggingFace failed");
    }
  } else {
    logger.warn("HuggingFace Circuit Breaker OPEN - Skipping");
  }

  // All providers failed
  throw new Error(`All AI providers failed or blocked: ${JSON.stringify(errors)}`);
}
