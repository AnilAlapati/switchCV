"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Sparkles, Command } from "lucide-react";

interface CreateResumeInputFormProps {
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  stage: string;
}

export function CreateResumeInputForm({
  currentInput,
  onInputChange,
  onSubmit,
  stage,
}: CreateResumeInputFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [currentInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const isGenerating = stage === "generating";
  const isComplete = stage === "complete";

  return (
    <div className="w-full">
      <form
        onSubmit={onSubmit}
        className={`relative flex items-end gap-2 bg-card/80 backdrop-blur-2xl border rounded-[2rem] p-2 shadow-2xl transition-all duration-300 ${isFocused
            ? "border-primary/40 ring-4 ring-primary/10"
            : "border-gray-200/50 hover:border-gray-300/50"
          }`}
      >
        {/* Unique Icon Core */}
        <div
          className={`hidden md:flex items-center justify-center w-10 h-10 rounded-xl ml-2 self-end mb-3 transition-all duration-500 ${isFocused
              ? "bg-primary text-white rotate-0"
              : "bg-muted text-muted-foreground -rotate-12"
            }`}
        >
          {isGenerating ? (
            <Sparkles className="w-5 h-5 animate-pulse" />
          ) : (
            <Command className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={currentInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={() => setIsFocused(false)}
            aria-label="Message input"
            placeholder={
              isGenerating
                ? "✨ Strategizing your career path..."
                : isComplete
                  ? "✓ Strategy locked. View below."
                  : "Describe your dream role or paste your experience..."
            }
            className="w-full p-3.5 bg-transparent border-none text-foreground placeholder-muted-foreground/60 focus:outline-none resize-none min-h-[52px] max-h-[120px] overflow-y-auto text-base leading-relaxed font-medium scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            disabled={isGenerating || isComplete}
            rows={1}
          />
        </div>

        <button
          type="submit"
          aria-label="Send message"
          className={`group relative rounded-2xl font-semibold shadow-lg transition-all transform active:scale-95 flex items-center justify-center w-[52px] h-[52px] overflow-hidden self-end mb-1 ${!currentInput.trim() || isGenerating || isComplete
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-600/25"
            }`}
          disabled={!currentInput.trim() || isGenerating || isComplete}
        >
          {isGenerating ? (
            <div className="flex gap-1 scale-75">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
            </div>
          ) : (
            <Send className="w-5 h-5 relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          )}
        </button>
      </form>

      <div className="mt-3 flex justify-center gap-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-black">
        <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
          <div className="w-1 h-1 bg-primary rounded-full" />
          Neural Engine
        </span>
        <span className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-default">
          <div className="w-1 h-1 bg-emerald-500 rounded-full" />
          ATS Intelligence
        </span>
      </div>
    </div>
  );
}
