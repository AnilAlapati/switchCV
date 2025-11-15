// src/hooks/useAIConnection.ts
import { useState } from "react";

interface AIConnectionStatus {
  connected: boolean;
  model: string;
  error?: string;
}

export const useAIConnection = () => {
  const [aiModelUsed, setAiModelUsed] = useState<string>("");
  const [aiConnectionStatus, setAiConnectionStatus] =
    useState<AIConnectionStatus | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);

  const setConnected = (model: string) => {
    setAiConnectionStatus({ connected: true, model });
    setAiModelUsed(model);
  };

  const setConnectionError = (error: string) => {
    setAiConnectionStatus({
      connected: false,
      model: "",
      error,
    });
  };

  const resetConnection = () => {
    setAiConnectionStatus(null);
    setAiModelUsed("");
    setIsGeneratingQuestion(false);
  };

  return {
    aiModelUsed,
    setAiModelUsed,
    aiConnectionStatus,
    setAiConnectionStatus,
    isGeneratingQuestion,
    setIsGeneratingQuestion,
    setConnected,
    setConnectionError,
    resetConnection,
  };
};
