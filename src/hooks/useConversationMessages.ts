// src/hooks/useConversationMessages.ts
import { useState } from "react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const useConversationMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);

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

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    setMessages,
    addMessage,
    addAssistantMessageWithDelay,
    clearMessages,
  };
};
