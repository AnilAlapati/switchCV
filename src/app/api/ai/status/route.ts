import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check if AI services are configured
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasHuggingFace = !!process.env.HUGGINGFACE_TOKEN;

    if (hasGemini) {
      return NextResponse.json({
        connected: true,
        model: "gemini-1.5-flash",
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
        error: "No AI provider configured",
      });
    }
  } catch (error) {
    console.error("Error checking AI status:", error);
    return NextResponse.json(
      {
        connected: false,
        error: "Failed to check AI status",
      },
      { status: 500 }
    );
  }
}
