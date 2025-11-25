"use client";

import { MutableRefObject } from "react";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ResumeEditMessageListProps {
  messages: Message[];
  endRef: MutableRefObject<HTMLDivElement | null>;
}

export function ResumeEditMessageList({
  messages,
  endRef,
}: ResumeEditMessageListProps) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-700/50 min-h-[420px] max-h-[600px] overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
      {messages.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <p className="text-xl font-semibold mb-3 text-white">
            Let’s fine-tune your resume
          </p>
          <p className="text-gray-400 max-w-md mx-auto">
            Ask for any change—add a new accomplishment, update your summary,
            adjust skills, or remove an outdated role. I’ll confirm everything
            before saving.
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isUser ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl shadow-lg ${
                message.isUser
                  ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                  : "bg-gray-700/80 backdrop-blur-sm text-gray-100 border border-gray-600/50"
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
