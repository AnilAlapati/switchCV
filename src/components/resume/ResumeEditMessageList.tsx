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
    <div className="glass-panel rounded-xl min-h-[420px] max-h-[600px] overflow-y-auto p-6 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-[#1A2F25]/60 py-12">
          <p className="text-xl font-bold mb-3 text-[#1A2F25]">
            Let’s fine-tune your resume
          </p>
          <p className="text-[#1A2F25]/70 max-w-md mx-auto">
            Ask for any change—add a new accomplishment, update your summary,
            adjust skills, or remove an outdated role. I’ll confirm everything
            before saving.
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? "justify-end" : "justify-start"
              }`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${message.isUser
                ? "bg-[#2C4A3B] text-white font-medium"
                : "bg-white/60 text-[#1A2F25] border border-white/60 backdrop-blur-sm"
                }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${message.isUser ? "text-white/70" : "text-[#1A2F25]/50"}`}>
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
