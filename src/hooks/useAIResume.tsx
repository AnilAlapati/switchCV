import { logger } from "@/lib/logger";
import { useState, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { getBestModelForTask } from "@/config/aiModels";
import { generateMockEnhancedResume } from "@/lib/mockAIResume";

export interface ResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  skills: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    url?: string;
  }>;
}

export interface EnhancedResumeContent {
  enhancedSummary: string;
  enhancedExperience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements: string[];
    enhancedDescription: string;
  }>;
  skillSuggestions: string[];
  improvementTips: string[];
}

export const useAIResume = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResumeContent = useCallback(
    async (
      resumeData: ResumeData,
      template: string = "modern",
      tone: "professional" | "creative" | "concise" = "professional",
      modelId?: string, // Optional - will auto-select if not provided
      mode: "standard" | "autonomous" = "standard",
      feedback?: string,
    ): Promise<EnhancedResumeContent | null> => {
      setLoading(true);
      setError(null);

      const startTime = Date.now();
      logger.info(
        {
          timestamp: new Date().toISOString(),
          requestedModel: modelId || "auto-select",
          tone,
          template,
        },
        "🤖 AI CALL STARTING",
      );

      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Auto-select best model if not specified
        if (!modelId) {
          const selectedModel = getBestModelForTask("resume-enhancement");
          modelId = selectedModel?.modelId || "gemini-2.5-flash";
          logger.info(
            `✨ Auto-selected AI model: ${modelId} (${selectedModel?.provider})`,
          );
        }

        const idToken = await user.getIdToken();

        logger.info(
          {
            url: "/api/ai/generate-resume",
            modelId,
            userId: user.uid.substring(0, 8) + "...",
            feedbackProvided: Boolean(feedback),
          },
          "📡 Sending request to local AI endpoint...",
        );

        const response = await fetch("/api/ai/generate-resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            resumeData,
            template,
            tone,
            modelId,
            mode,
            feedback,
          }),
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
          const errorData = await response.json();
          logger.error(
            {
              status: response.status,
              error: errorData.error,
              duration: `${duration}ms`,
            },
            "❌ AI CALL FAILED",
          );
          throw new Error(
            errorData.error || "Failed to generate resume content",
          );
        }

        const data = await response.json();
        logger.info(
          {
            duration: `${duration}ms`,
            model: data.model,
            provider: data.provider,
            enhancedSummaryLength: data.data?.enhancedSummary?.length || 0,
            skillSuggestionsCount: data.data?.skillSuggestions?.length || 0,
            timestamp: new Date().toISOString(),
          },
          "✅ AI CALL SUCCESS",
        );

        return data.data;
      } catch (err) {
        const duration = Date.now() - startTime;
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        logger.error(
          {
            error: errorMessage,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          },
          "💥 AI CALL ERROR",
        );

        // Fallback to mock AI when LLM is unavailable
        logger.warn("⚠️ AI Service unavailable, using mock AI generator...");
        try {
          const mockResult = generateMockEnhancedResume(
            resumeData.personalInfo.name,
            "Professional",
            "Your Organization",
            resumeData.skills,
          );
          logger.info("✅ MOCK AI GENERATED CONTENT");
          return mockResult as EnhancedResumeContent;
        } catch (mockErr) {
          logger.error({ err: mockErr }, "💥 MOCK AI FAILED TOO");
          setError(errorMessage);
          return null;
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    generateResumeContent,
    loading,
    error,
  };
};
