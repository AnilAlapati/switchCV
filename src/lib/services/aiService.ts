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
  const prompt = `You are an Autonomous AI Career Agent. Generate a professional and strategic, single-paragraph greeting that:
- Introduces yourself as an AI Career Agent (not just a builder/assistant)
- Explains that you'll autonomously strategize and build their resume based on their goals
- Asks what job role or industry they're targeting
- Mentions that you'll use this information to prioritize their strengths
- Gives 2-3 examples like 'Software Engineer at a tech startup', 'Marketing Manager', 'Data Scientist'
Keep it authoritative yet friendly, under 3 sentences. Explain briefly WHY you need the target role (to strategize their positioning).

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
