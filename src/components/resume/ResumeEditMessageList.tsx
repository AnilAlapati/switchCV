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
    <div className="bg-white min-h-[420px] max-h-[600px] overflow-y-auto p-6 space-y-4">
      {messages.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg font-bold mb-2 text-gray-900">
            Let&apos;s fine-tune your resume
          </p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Ask for any change—add a new accomplishment, update your summary,
            adjust skills, or remove an outdated role.
          </p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-4 ${
                message.isUser
                  ? "bg-black text-white font-medium"
                  : "bg-gray-100 text-gray-900 border border-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </p>
              <p
                className={`text-xs mt-1.5 ${message.isUser ? "text-white/60" : "text-gray-400"}`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}
