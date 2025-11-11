// API Route to force refresh AI model cache
// Call this endpoint when you notice model issues
// GET /api/ai/refresh-models

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
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
    console.error("Failed to refresh models:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch models",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
