// src/hooks/useAIConversation.ts
import { useState, useRef } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export type ConversationStage =
  | "initial"
  | "job_target"
  | "experience"
  | "skills"
  | "education"
  | "personal"
  | "generating"
  | "complete";

export interface ResumeData {
  jobTarget?: string;
  experience?: string;
  skills?: string;
  education?: string;
  personalInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
  };
}

interface AIConnectionStatus {
  connected: boolean;
  model: string;
  error?: string;
}

export const useAIConversation = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stage, setStage] = useState<ConversationStage>("initial");
  const [resumeData, setResumeData] = useState<ResumeData>({});
  const [aiModelUsed, setAiModelUsed] = useState<string>("");
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [aiConnectionStatus, setAiConnectionStatus] =
    useState<AIConnectionStatus | null>(null);
  const initializedRef = useRef(false);

  const addMessage = (content: string, role: "user" | "assistant") => {
    const message: Message = {
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const addAssistantMessageWithDelay = (
    content: string,
    delay: number = 500
  ) => {
    setTimeout(() => {
      addMessage(content, "assistant");
    }, delay);
  };

  const initializeAIGreeting = async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    setIsGeneratingQuestion(true);
    console.log("🚀 Initializing AI connection and generating greeting...");

    const prompt = `You are a professional AI Resume Assistant. Generate a warm, engaging, single-paragraph greeting that:
- Introduces yourself as an AI Resume Assistant
- Explains you'll help create a perfect resume
- Asks what job role or industry they're targeting
- Gives 2-3 examples like 'Software Engineer at a tech startup', 'Marketing Manager', 'Data Scientist'
Keep it friendly and conversational, under 3 sentences.

Greeting:`;

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      const data = await response.json();
      const greeting = data.text;
      const modelUsed = data.model;

      console.log(`✅ ${modelUsed} API connected successfully!`);

      setAiConnectionStatus({ connected: true, model: modelUsed });
      setAiModelUsed(modelUsed);

      setMessages([
        {
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);

      setStage("job_target");
      console.log(
        `✨ Initial greeting generated successfully using ${modelUsed}!`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ AI initialization failed:", errorMsg);

      const errorMessage = `⚠️ Unable to connect to AI services. Please check your API key configuration in .env.local\n\nError: ${errorMsg}`;

      setAiConnectionStatus({
        connected: false,
        model: "",
        error: errorMsg,
      });

      setMessages([
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const generateNextQuestion = async (
    currentStage: ConversationStage,
    collectedData: ResumeData
  ): Promise<string> => {
    setIsGeneratingQuestion(true);
    console.log("🤔 Generating personalized question...", {
      currentStage,
      collectedData,
    });

    try {
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      let prompt = "";
      switch (currentStage) {
        case "experience":
          prompt = `You are a professional resume coach. The user wants a job as: "${collectedData.jobTarget}".
          
Generate ONE specific, engaging question to ask about their work experience that's relevant to their target role. The question should:
- Be conversational and friendly
- Ask about relevant experience for their specific job target
- Encourage detailed responses about achievements
- Be a single sentence

Question:`;
          break;

        case "skills":
          prompt = `You are a professional resume coach. The user wants a job as: "${collectedData.jobTarget}" and has experience: "${collectedData.experience}".
          
Generate ONE specific question to ask about their technical/professional skills that's relevant to their target role. The question should:
- Be conversational and friendly
- Focus on skills relevant to their job target
- Consider their experience background
- Be a single sentence

Question:`;
          break;

        case "education":
          prompt = `You are a professional resume coach. The user wants a job as: "${collectedData.jobTarget}".
          
Generate ONE specific question about their educational background relevant to their target role. The question should:
- Be conversational and friendly
- Ask about relevant degrees, certifications, or training
- Be a single sentence

Question:`;
          break;

        case "personal":
          prompt = `You are a professional resume coach. Generate a friendly, single-sentence question asking for their contact information (full name, email, and location). Keep it simple and professional.

Question:`;
          break;

        default:
          return "Tell me more about that.";
      }

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          maxTokens: 100,
          temperature: 0.8,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${data.model} API success`);
        return data.text;
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      console.error("Error generating question:", error);
      const fallbacks: Record<string, string> = {
        experience:
          "Great! Now tell me about your work experience. What's your most recent role and what did you accomplish there?",
        skills:
          "Excellent! What are your key skills and technologies? List them out.",
        education:
          "Perfect! What's your educational background? (e.g., 'Bachelor's in Computer Science from MIT, 2018')",
        personal:
          "Almost done! What's your full name, email, and location? (e.g., 'John Smith, john@email.com, San Francisco, CA')",
      };
      return fallbacks[currentStage] || "Tell me more.";
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  return {
    messages,
    setMessages,
    stage,
    setStage,
    resumeData,
    setResumeData,
    aiModelUsed,
    setAiModelUsed,
    isGeneratingQuestion,
    aiConnectionStatus,
    setAiConnectionStatus,
    initializedRef,
    addMessage,
    addAssistantMessageWithDelay,
    initializeAIGreeting,
    generateNextQuestion,
  };
};
