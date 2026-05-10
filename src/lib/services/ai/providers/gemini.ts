import { logger } from "@/lib/logger";
import { withRetry } from "@/lib/utils/retry";
import { AI_ENDPOINTS, DEFAULT_STOP_SEQUENCES } from "@/config/aiEndpoints";
import {
  fetchWithTimeout,
  validateContextWindow,
  TokenUsage,
} from "../core-utils";
import {
  getAIConstants,
  loadModelSelection,
  selectBestModel,
  resetModelCache,
} from "../model-manager";
import type { GeminiJsonSchema } from "@/lib/utils/zodToGeminiSchema";

/**
 * Options for Gemini structured output (guaranteed valid JSON responses).
 * When provided, Gemini will return a JSON object matching the given schema.
 */
export interface GeminiStructuredOutputOptions {
  /** The JSON schema the response must conform to */
  responseSchema: GeminiJsonSchema;
  /** Description to help Gemini understand the expected output */
  schemaDescription?: string;
}

/**
 * Generate text using Gemini API
 *
 * @param prompt - The prompt text
 * @param maxTokens - Max output tokens (default 150)
 * @param temperature - Temperature (default 0.7)
 * @param model - Optional model override
 * @param structuredOutput - Optional structured output config for guaranteed JSON
 * @param systemInstruction - Optional system instruction sent via the Gemini systemInstruction field
 */
export async function generateWithGemini(
  prompt: string,
  maxTokens: number = 150,
  temperature: number = 0.7,
  model?: string,
  structuredOutput?: GeminiStructuredOutputOptions,
  systemInstruction?: string,
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
      logger.error(
        "Gemini context loop exceeded safety limit - breaking infinite loop",
      );
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
        resetModelCache();
        selection = {
          models: [...constants.MODEL_PREFERENCES],
          usingFallback: true,
        };
        attemptedModels.clear();
        continue;
      }

      resetModelCache();
      attemptedModels.clear();
      remoteRefreshes += 1;
      selection = await loadModelSelection(apiKey);
      continue;
    }

    const modelName = model || (await selectBestModel(candidatePool));
    logger.info({ model: modelName }, "Using Gemini model");

    // Validate context window
    await validateContextWindow(prompt, modelName);

    let response: Response;
    try {
      // Build generationConfig with optional structured output
      const generationConfig: Record<string, unknown> = {
        temperature,
        maxOutputTokens: maxTokens,
        stopSequences: [...DEFAULT_STOP_SEQUENCES],
      };

      // When structured output is requested, tell Gemini to return JSON
      if (structuredOutput) {
        generationConfig.responseMimeType = "application/json";
        generationConfig.responseSchema = structuredOutput.responseSchema;
        // Remove stop sequences for structured output — Gemini handles termination
        delete generationConfig.stopSequences;
      }

      const requestPayload: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
      };
      if (systemInstruction) {
        requestPayload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      response = await withRetry(() =>
        fetchWithTimeout(AI_ENDPOINTS.GEMINI.GENERATE(modelName, apiKey), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
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
