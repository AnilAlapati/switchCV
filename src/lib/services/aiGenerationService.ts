// src/lib/services/aiGenerationService.ts

// Cache for available models (expires after 24 hours)
let modelCache: {
  models: string[];
  timestamp: number;
} | null = null;
let inflightModelFetch: Promise<string[]> | null = null;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_MODEL = "gemini-2.0-flash-lite";
const MAX_REMOTE_MODEL_REFRESHES = 2;

// Preferred model patterns (in order of preference)
const MODEL_PREFERENCES = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
  "gemini-pro-latest",
];

/**
 * Fetch and cache available Gemini models
 */
async function getAvailableGeminiModels(apiKey: string): Promise<string[]> {
  // Return cached models if still valid
  if (modelCache && Date.now() - modelCache.timestamp < CACHE_DURATION) {
    return modelCache.models;
  }

  if (!inflightModelFetch) {
    inflightModelFetch = (async () => {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();
        const models =
          data.models
            ?.filter((model: any) =>
              model.supportedGenerationMethods?.includes("generateContent")
            )
            .map((model: any) => model.name.replace("models/", "")) || [];

        modelCache = {
          models,
          timestamp: Date.now(),
        };

        console.log(`📋 Cached ${models.length} available Gemini models`);
        return models;
      } catch (error) {
        console.error("Failed to fetch Gemini models:", error);
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
      console.log(`✅ Selected model: ${match}`);
      return match;
    }
  }

  // If no preference matched, use the first available model
  if (availableModels.length > 0) {
    console.log(`⚠️ Using fallback model: ${availableModels[0]}`);
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
    console.log(`🤖 Using Gemini model: ${modelName}`);

    let response: Response;
    try {
      response = await fetch(
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
  const response = await fetch(
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
    console.log("🔄 Trying Gemini API...");
    const result = await generateWithGemini(prompt, maxTokens, temperature);
    console.log(`✅ Gemini API success with ${result.model}`);
    return {
      text: result.text,
      model: result.model,
      provider: "google",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.gemini = errorMsg;
    console.error("❌ Gemini failed:", errorMsg);
  }

  // Try HuggingFace as fallback
  try {
    console.log("🔄 Trying HuggingFace API...");
    const text = await generateWithHuggingFace(prompt, maxTokens, temperature);
    console.log("✅ HuggingFace API success");
    return {
      text,
      model: "FLAN-T5 Base",
      provider: "huggingface",
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    errors.huggingface = errorMsg;
    console.error("❌ HuggingFace failed:", errorMsg);
  }

  // Both failed
  throw new Error(`All AI providers failed: ${JSON.stringify(errors)}`);
}
