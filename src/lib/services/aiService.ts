// src/lib/services/aiService.ts
import { ResumeData, ConversationStage } from "@/hooks/useResumeDataCollection";
import { getPromptForStage, FALLBACK_RESPONSES } from "@/lib/utils/aiPrompts";
import { logger } from "@/lib/logger";
import { apiClient } from "@/lib/apiClient";

const AI_CLIENT_TIMEOUT = 45000; // 45 seconds

interface AIGenerateResponse {
  text: string;
  model: string;
}

export const initializeAIGreeting = async (): Promise<AIGenerateResponse> => {
  const prompt = `You are a professional AI Resume Assistant. Generate a warm, engaging, single-paragraph greeting that:
- Introduces yourself as an AI Resume Assistant
- Explains you'll help create a perfect resume
- Asks what job role or industry they're targeting
- Gives 2-3 examples like 'Software Engineer at a tech startup', 'Marketing Manager', 'Data Scientist'
Keep it friendly and conversational, under 3 sentences.

Greeting:`;

  return apiClient<AIGenerateResponse>("/api/ai/generate", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      maxTokens: 150,
      temperature: 0.9,
    }),
    timeout: AI_CLIENT_TIMEOUT,
  });
};

export const generateQuestionForStage = async (
  stage: ConversationStage,
  resumeData: ResumeData
): Promise<string> => {
  try {
    const prompt = getPromptForStage(stage, resumeData);

    const data = await apiClient<{ text: string }>("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        prompt,
        maxTokens: 100,
        temperature: 0.8,
      }),
      timeout: AI_CLIENT_TIMEOUT,
    });

    return data.text;
  } catch (error) {
    logger.error({ err: error, stage }, "Error generating question");
    return FALLBACK_RESPONSES[stage] || "Tell me more.";
  }
};
