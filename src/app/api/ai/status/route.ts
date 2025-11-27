import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-helpers";

// Model preferences (in order of preference)
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
 * Fetch available Gemini models and select the best one
 */
async function getBestGeminiModel(apiKey: string): Promise<string> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      return "gemini-2.5-flash"; // Fallback
    }

    const data = await response.json();
    const availableModels =
      data.models
        ?.filter((model: any) =>
          model.supportedGenerationMethods?.includes("generateContent")
        )
        .map((model: any) => model.name.replace("models/", "")) || [];

    // Try each preference in order
    for (const preferred of MODEL_PREFERENCES) {
      const match = availableModels.find((model: string) =>
        model.toLowerCase().includes(preferred.toLowerCase())
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
    // Check if AI services are configured
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasHuggingFace = !!process.env.HUGGINGFACE_TOKEN;

    if (hasGemini) {
      const bestModel = await getBestGeminiModel(process.env.GEMINI_API_KEY!);
      return NextResponse.json({
        connected: true,
        model: bestModel,
        provider: "Google Gemini",
      });
    } else if (hasHuggingFace) {
      return NextResponse.json({
        connected: true,
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        provider: "Hugging Face",
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
