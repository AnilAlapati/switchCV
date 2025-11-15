// API Route for AI text generation
// This runs server-side, avoiding CORS and keeping API keys secure

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/services/aiGenerationService";

interface GenerateRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt, maxTokens = 150, temperature = 0.9 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const result = await generateText(prompt, maxTokens, temperature);
    return NextResponse.json(result);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
