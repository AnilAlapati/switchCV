// API Route to force refresh AI model cache
// Call this endpoint when you notice model issues
// GET /api/ai/refresh-models

import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return handleApiError(
        new Error("Gemini API key not configured"),
        "Gemini API key not configured",
        500
      );
    }

    // Fetch latest models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const allModels =
      data.models?.map((m: any) => ({
        name: m.name.replace("models/", ""),
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      })) || [];

    const compatibleModels = allModels.filter((m: any) =>
      m.methods?.includes("generateContent")
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total: allModels.length,
      compatible: compatibleModels.length,
      models: compatibleModels,
      message: "Model cache will be refreshed on next API call",
    });
  } catch (error) {
    return handleApiError(error, "Failed to refresh models");
  }
}
