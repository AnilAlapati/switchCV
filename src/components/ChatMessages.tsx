// src/components/ChatMessages.tsx
"use client";

import { useRef, useEffect } from "react";
import type { Message } from "@/hooks/useAIConversation";

interface ChatMessagesProps {
  messages: Message[];
  isGeneratingQuestion: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  isGeneratingQuestion,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Show initial loading state */}
      {messages.length === 0 && isGeneratingQuestion && (
        <div className="flex justify-center items-center py-12 space-y-4 flex-col">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
          <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg px-6 py-3">
            <p className="text-purple-300 text-sm font-medium">
              🤖 Connecting to AI and preparing your assistant...
            </p>
            <p className="text-purple-400 text-xs mt-1">
              Testing Gemini and HuggingFace APIs
            </p>
          </div>
        </div>
      )}

      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-white"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <p className="text-xs text-gray-400 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}

      {isGeneratingQuestion && (
        <div className="flex justify-start">
          <div className="bg-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
            <p className="text-sm text-purple-300">
              AI is crafting your next question...
            </p>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
