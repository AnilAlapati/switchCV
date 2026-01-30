import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-helpers";
import { AI_ENDPOINTS } from "@/config/aiEndpoints";

// Model preferences (in order of preference)
const MODEL_PREFERENCES = [
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-pro",
  "gemini-pro-latest",
];

/**
 * Fetch available Gemini models and select the best one
 */
async function getBestGeminiModel(apiKey: string): Promise<string> {
  try {
    const response = await fetch(
      AI_ENDPOINTS.GEMINI.MODELS(apiKey),
      { next: { revalidate: 3600 } }, // Cache for 1 hour
    );

    if (!response.ok) {
      return "gemini-2.5-flash"; // Fallback
    }

    const data = await response.json();
    interface GeminiModel {
      name: string;
      supportedGenerationMethods: string[];
    }

    const availableModels =
      (data.models as GeminiModel[] | undefined)
        ?.filter((model) =>
          model.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((model) => model.name.replace("models/", "")) || [];

    // Try each preference in order
    for (const preferred of MODEL_PREFERENCES) {
      const match = availableModels.find((model: string) =>
        model.toLowerCase().includes(preferred.toLowerCase()),
      );
      if (match) {
        return match;
      }
    }

    // Use first available model if no preference matched
    return availableModels[0] || "gemini-2.5-flash";
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch Gemini models:");
    return "gemini-2.5-flash"; // Fallback
  }
}

export async function GET() {
  try {
    // Check what AI providers are actually available
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    // Tier-based model selection (matches actual usage in aiProviderService)
    // Primary is Gemini, fallback to OpenAI
    if (hasGemini) {
      const bestModel = await getBestGeminiModel(process.env.GEMINI_API_KEY!);
      return NextResponse.json({
        connected: true,
        model: bestModel,
        provider: "Google Gemini",
      });
    } else if (hasOpenAI) {
      return NextResponse.json({
        connected: true,
        model: "gpt-4o-mini",
        provider: "OpenAI",
      });
    } else {
      return NextResponse.json({
        connected: false,
        message: "No AI provider configured",
      });
    }
  } catch (error) {
    return handleApiError(error, "Failed to check AI status");
  }
}
