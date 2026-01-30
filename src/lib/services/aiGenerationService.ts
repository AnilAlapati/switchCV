import { withRetry } from "@/lib/utils/retry";
import { logger } from "@/lib/logger";
import { getConstants } from "@/lib/getSystemConfig";
import { AI_ENDPOINTS, DEFAULT_STOP_SEQUENCES } from "@/config/aiEndpoints";

const AI_REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(
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

// Global Safety Rate Limiter
// Prevents any infinite loop bug from spamming APIs, regardless of logic context
const SAFETY_LIMIT_WINDOW_MS = 60000; // 1 minute
// Default to 1000 in production to allow high traffic, 100 in dev for stricter checks
// Can be overridden by AI_GLOBAL_SAFETY_LIMIT env var
const DEFAULT_SAFETY_LIMIT = process.env.NODE_ENV === "production" ? 1000 : 100;
const SAFETY_LIMIT_MAX_REQUESTS = Number(process.env.AI_GLOBAL_SAFETY_LIMIT) || DEFAULT_SAFETY_LIMIT;

let globalRequestCount = 0;
let globalWindowStart = Date.now();

function checkGlobalSafetyLimit() {
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

// Token counting utility (Heuristic)
const TOKENS_PER_CHAR = 0.25; // ~4 chars = 1 token
const MAX_TOKENS_GEMINI = 30000; // Safe buffer
const MAX_TOKENS_DEFAULT = 4000; // Standard window

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length * TOKENS_PER_CHAR);
}

async function validateContextWindow(
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

/**
 * Select the best available model based on preferences
 */
async function selectBestModel(availableModels: string[]): Promise<string> {
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

/**
 * Token usage information from LLM APIs
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Generate text using Gemini API
 */
async function generateWithGemini(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
  model?: string,
): Promise<{ text: string; model: string; usage?: TokenUsage }> {
  const { getSecret } = await import("@/lib/services/secretManagerService");
  const apiKey = await getSecret("GEMINI_API_KEY");

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
      usingFallback: false,
    };
  }

  let loopCount = 0;
  const MAX_LOOP_ITERATIONS = 10; // Safety brake

  while (selection.models.length) {
    loopCount++;
    if (loopCount > MAX_LOOP_ITERATIONS) {
      logger.error("Gemini context loop exceeded safety limit - breaking infinite loop");
      break;
    }

    const candidatePool = selection.models.filter(
      (m) => !attemptedModels.has(m),
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

    const modelName = model || (await selectBestModel(candidatePool));
    logger.info({ model: modelName }, "Using Gemini model");

    // NEW: Validate context window
    await validateContextWindow(prompt, modelName);

    let response: Response;
    try {
      response = await withRetry(() =>
        fetchWithTimeout(AI_ENDPOINTS.GEMINI.GENERATE(modelName, apiKey), {
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
              stopSequences: [...DEFAULT_STOP_SEQUENCES],
            },
          }),
        }),
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
        `Gemini API error (${response.status}): ${errorText}`,
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

    // Parse usageMetadata from Gemini response
    const usage: TokenUsage | undefined = data.usageMetadata
      ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      }
      : undefined;

    return {
      text: text.trim(),
      model: modelName,
      usage,
    };
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Gemini API error: No supported models available");
}

async function generateWithOpenAI(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
): Promise<{ text: string; model: string; usage?: TokenUsage }> {
  const { getSecret } = await import("@/lib/services/secretManagerService");
  const apiKey = await getSecret("OPENAI_API_KEY");

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const model = "gpt-4o-mini"; // Fast and cheap

  await validateContextWindow(prompt, model);

  const response = await withRetry(() =>
    fetchWithTimeout(AI_ENDPOINTS.OPENAI.CHAT_COMPLETIONS, {
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
        stop: [...DEFAULT_STOP_SEQUENCES],
      }),
    }),
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

  // Parse usage from OpenAI response
  const usage: TokenUsage | undefined = data.usage
    ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    }
    : undefined;

  return {
    text: text.trim(),
    model,
    usage,
  };
}

/**
 * Generate text using Groq API (fast inference)
 */
async function generateWithGroq(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
): Promise<{ text: string; model: string; usage?: TokenUsage }> {
  const { getSecret } = await import("@/lib/services/secretManagerService");
  const apiKey = await getSecret("GROQ_API_KEY");

  if (!apiKey) {
    throw new Error("Groq API key not configured");
  }

  const model = "llama-3.3-70b-versatile"; // Fast and free tier available

  await validateContextWindow(prompt, model);

  const response = await withRetry(() =>
    fetchWithTimeout(AI_ENDPOINTS.GROQ.CHAT_COMPLETIONS, {
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
        stop: [...DEFAULT_STOP_SEQUENCES],
      }),
    }),
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

  // Parse usage from Groq response (OpenAI-compatible format)
  const usage: TokenUsage | undefined = data.usage
    ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    }
    : undefined;

  return {
    text: text.trim(),
    model,
    usage,
  };
}

import { providerFallback } from "@/lib/services/ai/ProviderFallbackChain";
import { aiCircuitBreaker } from "@/lib/services/ai/CircuitBreaker";

/**
 * Generate text with dynamic fallback based on provider health
 */
export async function generateText(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
  model?: string,
): Promise<{
  text: string;
  model: string;
  provider: string;
  usage?: TokenUsage;
}> {
  // 1. GLOBAL SAFETY CHECK (The "Kill Switch")
  checkGlobalSafetyLimit();

  const providers = providerFallback.getPrioritizedProviders();
  const errors: Record<string, string> = {};

  for (const provider of providers) {
    const startTime = Date.now();

    try {
      logger.info({ provider }, "Attempting AI generation");

      let result;
      switch (provider) {
        case "gemini":
          result = await generateWithGemini(
            prompt,
            maxTokens,
            temperature,
            model,
          );
          break;
        case "openai":
          result = await generateWithOpenAI(prompt, maxTokens, temperature);
          break;
        case "groq":
          result = await generateWithGroq(prompt, maxTokens, temperature);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Success
      const duration = Date.now() - startTime;
      logger.info(
        { provider, model: result.model, duration },
        "Generation success",
      );

      providerFallback.reportSuccess(provider, duration);
      aiCircuitBreaker.recordSuccess(provider);

      return {
        text: result.text,
        model: result.model,
        provider,
        usage: result.usage,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors[provider] = errorMsg;

      logger.warn({ provider, err: error }, "Provider generation failed");

      // Update health and circuit breaker
      providerFallback.reportFailure(provider);
      aiCircuitBreaker.recordFailure(provider);
    }
  }

  // All providers failed
  logger.error({ errors }, "All AI providers failed");
  throw new Error(`All AI providers failed: ${JSON.stringify(errors)}`);
}

/**
 * Generate vector embeddings for text using Gemini
 * Model: models/embedding-001 (768 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { getSecret } = await import("@/lib/services/secretManagerService");
  const apiKey = await getSecret("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Gemini API key missing");

  // model: "models/embedding-001" or "models/text-embedding-004"
  const model = "models/text-embedding-004";

  const result = await fetchWithTimeout(
    AI_ENDPOINTS.GEMINI.EMBED(model, apiKey),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        model,
      }),
    },
  );

  if (!result.ok) {
    const err = await result.text();
    throw new Error(`Embedding failed (${result.status}): ${err}`);
  }

  const data = await result.json();
  // data.embedding.values
  const values = data.embedding?.values;

  if (!values || !Array.isArray(values)) {
    throw new Error("Invalid embedding response structure");
  }

  return values;
}
