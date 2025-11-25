// src/lib/services/aiService.ts
import { ResumeData, ConversationStage } from "@/hooks/useResumeDataCollection";
import { getPromptForStage, FALLBACK_RESPONSES } from "@/lib/utils/aiPrompts";
import { logger } from "@/lib/logger";

interface AIGenerateResponse {
  text: string;
  model: string;
}

export const initializeAIGreeting = async (): Promise<AIGenerateResponse> => {
  const { getAuth } = await import("firebase/auth");
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("User not authenticated");
  }

  const token = await currentUser.getIdToken();

  const prompt = `You are a professional AI Resume Assistant. Generate a warm, engaging, single-paragraph greeting that:
- Introduces yourself as an AI Resume Assistant
- Explains you'll help create a perfect resume
- Asks what job role or industry they're targeting
- Gives 2-3 examples like 'Software Engineer at a tech startup', 'Marketing Manager', 'Data Scientist'
Keep it friendly and conversational, under 3 sentences.

Greeting:`;

  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      prompt,
      maxTokens: 150,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `API failed: ${errorData.error || response.statusText}\n${
        errorData.details
          ? Object.entries(errorData.details)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : ""
      }`
    );
  }

  return response.json();
};

export const generateQuestionForStage = async (
  stage: ConversationStage,
  resumeData: ResumeData
): Promise<string> => {
  try {
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const token = await currentUser.getIdToken();
    const prompt = getPromptForStage(stage, resumeData);

    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prompt,
        maxTokens: 100,
        temperature: 0.8,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.text;
    } else {
      throw new Error("API request failed");
    }
  } catch (error) {
    logger.error({ err: error, stage }, "Error generating question");
    return FALLBACK_RESPONSES[stage] || "Tell me more.";
  }
};
