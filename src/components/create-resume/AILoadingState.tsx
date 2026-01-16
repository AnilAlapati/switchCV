"use client";

import { Bot } from "lucide-react";

interface AILoadingStateProps {
  aiLoading: boolean;
  aiError: string | null;
}

export function AILoadingState({ aiLoading, aiError }: AILoadingStateProps) {
  if (!aiLoading && !aiError) {
    return null;
  }

  if (aiError) {
    return (
      <div className="flex items-end gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 border border-red-200">
          <Bot className="w-5 h-5 text-red-600" />
        </div>
        <div className="max-w-[80%] p-4 rounded-2xl rounded-bl-none shadow-sm bg-red-50 border border-red-100 text-red-800">
          <p className="text-sm font-medium">⚠️ {aiError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
        <Bot className="w-5 h-5 text-primary" />
      </div>
      <div className="p-4 rounded-2xl rounded-bl-none shadow-sm bg-white/60 backdrop-blur-sm border border-white/40">
        <div className="flex space-x-1.5 items-center h-5">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
