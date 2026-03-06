import { logger } from "@/lib/logger";
import { AI_ENDPOINTS } from "@/config/aiEndpoints";
import {
  fetchWithTimeout,
  checkGlobalSafetyLimit,
  TokenUsage as CoreTokenUsage,
} from "./ai/core-utils";
import {
  invalidateModelCache as coreInvalidateModelCache,
  getCacheStatus as coreGetCacheStatus,
} from "./ai/model-manager";
import { generateWithGemini, type GeminiStructuredOutputOptions } from "./ai/providers/gemini";
import { generateWithOpenAI } from "./ai/providers/openai";
import { generateWithGroq } from "./ai/providers/groq";
import { providerFallback } from "@/lib/services/ai/ProviderFallbackChain";
import { aiCircuitBreaker } from "@/lib/services/ai/CircuitBreaker";
import { BillingService } from "@/lib/services/billingService";

export type TokenUsage = CoreTokenUsage;

/**
 * Invalidate the model cache (useful for testing or forced refresh)
 */
export const invalidateModelCache = coreInvalidateModelCache;

/**
 * Get cache status for monitoring
 */
export const getCacheStatus = coreGetCacheStatus;

/**
 * Generate text with dynamic fallback based on provider health.
 * Tracks AI cost via BillingService when userId is provided.
 *
 * @param prompt - The prompt text
 * @param maxTokens - Max output tokens (default 150)
 * @param temperature - Temperature (default 0.7)
 * @param model - Optional model override
 * @param userId - Optional user ID for billing tracking
 * @param structuredOutput - Optional structured output config for guaranteed JSON (Gemini only)
 */
export async function generateText(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
  model?: string,
  userId?: string,
  structuredOutput?: GeminiStructuredOutputOptions,
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
          result =
            structuredOutput === undefined
              ? await generateWithGemini(
                  prompt,
                  maxTokens,
                  temperature,
                  model,
                )
              : await generateWithGemini(
                  prompt,
                  maxTokens,
                  temperature,
                  model,
                  structuredOutput,
                );
          break;
        case "openai":
          result = await generateWithOpenAI(prompt, maxTokens, temperature, structuredOutput ? true : false);
          break;
        case "groq":
          result = await generateWithGroq(prompt, maxTokens, temperature, structuredOutput ? true : false);
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

      // Track AI cost via BillingService (fire-and-forget, don't block response)
      if (userId && result.usage) {
        BillingService.trackUsage(userId, result.model || model || "default", {
          input: result.usage.promptTokens ?? result.usage.totalTokens ?? 0,
          output: result.usage.completionTokens ?? 0,
        }).catch((err: unknown) => {
          logger.error(
            { err, userId, model: result.model },
            "Failed to track AI usage cost",
          );
        });
      }

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
  const values = data.embedding?.values;

  if (!values || !Array.isArray(values)) {
    throw new Error("Invalid embedding response structure");
  }

  return values;
}
