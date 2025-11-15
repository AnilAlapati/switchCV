// src/hooks/useAIConversation.ts
import { useRef } from "react";
import { useConversationMessages, Message } from "./useConversationMessages";
import {
  useResumeDataCollection,
  ResumeData,
  ConversationStage,
} from "./useResumeDataCollection";
import { useAIConnection } from "./useAIConnection";
import {
  initializeAIGreeting,
  generateQuestionForStage,
} from "@/lib/services/aiService";

export type { Message, ConversationStage, ResumeData };

export const useAIConversation = () => {
  const initializedRef = useRef(false);
  const messages = useConversationMessages();
  const resumeCollection = useResumeDataCollection();
  const aiConnection = useAIConnection();

  const initializeAIGreetingInternal = async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    aiConnection.setIsGeneratingQuestion(true);
    console.log("🚀 Initializing AI connection and generating greeting...");

    try {
      const data = await initializeAIGreeting();
      const greeting = data.text;
      const modelUsed = data.model;

      console.log(`✅ ${modelUsed} API connected successfully!`);

      aiConnection.setConnected(modelUsed);

      messages.setMessages([
        {
          role: "assistant",
          content: greeting,
          timestamp: new Date(),
        },
      ]);

      resumeCollection.setStage("job_target");
      console.log(
        `✨ Initial greeting generated successfully using ${modelUsed}!`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ AI initialization failed:", errorMsg);

      const errorMessage = `⚠️ Unable to connect to AI services. Please check your API key configuration in .env.local\n\nError: ${errorMsg}`;

      aiConnection.setConnectionError(errorMsg);

      messages.setMessages([
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      aiConnection.setIsGeneratingQuestion(false);
    }
  };

  const generateNextQuestion = async (
    currentStage: ConversationStage,
    collectedData: ResumeData
  ): Promise<string> => {
    aiConnection.setIsGeneratingQuestion(true);
    console.log("🤔 Generating personalized question...", {
      currentStage,
      collectedData,
    });

    try {
      const question = await generateQuestionForStage(
        currentStage,
        collectedData
      );
      return question;
    } finally {
      aiConnection.setIsGeneratingQuestion(false);
    }
  };

  return {
    // Messages API
    messages: messages.messages,
    setMessages: messages.setMessages,
    addMessage: messages.addMessage,
    addAssistantMessageWithDelay: messages.addAssistantMessageWithDelay,

    // Resume Collection API
    stage: resumeCollection.stage,
    setStage: resumeCollection.setStage,
    resumeData: resumeCollection.resumeData,
    setResumeData: resumeCollection.setResumeData,
    advanceStage: resumeCollection.advanceStage,
    updateResumeData: resumeCollection.updateResumeData,

    // AI Connection API
    aiModelUsed: aiConnection.aiModelUsed,
    setAiModelUsed: aiConnection.setAiModelUsed,
    aiConnectionStatus: aiConnection.aiConnectionStatus,
    setAiConnectionStatus: aiConnection.setAiConnectionStatus,
    isGeneratingQuestion: aiConnection.isGeneratingQuestion,

    // Composition Methods
    initializedRef,
    initializeAIGreeting: initializeAIGreetingInternal,
    generateNextQuestion,
  };
};
