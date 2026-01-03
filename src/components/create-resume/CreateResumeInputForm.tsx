"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Sparkles, Command, Zap, Brain } from "lucide-react";

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
      onSubmit(e as any);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 300);
  };

  const isGenerating = stage === "generating";
  const isComplete = stage === "complete";

  return (
    <div className="relative max-w-4xl mx-auto w-full px-4 pb-8">
      {/* Unique "Thinking" Aura */}
      {isFocused && currentInput.length > 0 && !isGenerating && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="px-3 py-1 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-full text-[10px] font-bold text-primary uppercase tracking-tighter flex items-center gap-1">
            <Brain className="w-3 h-3" />
            Analyzing Intent
          </div>
          <div className="px-3 py-1 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-600 uppercase tracking-tighter flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Strategy Mode
          </div>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className={`relative flex items-end gap-2 bg-card/80 backdrop-blur-2xl border rounded-[2rem] p-2 shadow-2xl transition-all duration-500 ${
          isFocused
            ? "border-primary/40 ring-8 ring-primary/5 scale-[1.02]"
            : "border-white/20"
        }`}
      >
        {/* Unique Icon Core */}
        <div
          className={`hidden md:flex items-center justify-center w-12 h-12 rounded-2xl ml-2 transition-all duration-500 ${
            isFocused
              ? "bg-primary text-white rotate-0"
              : "bg-muted text-muted-foreground -rotate-12"
          }`}
        >
          {isGenerating ? (
            <Sparkles className="w-6 h-6 animate-pulse" />
          ) : (
            <Command className="w-6 h-6" />
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
            className="w-full p-4 bg-transparent border-none text-foreground placeholder-muted-foreground/60 focus:outline-none resize-none min-h-[60px] max-h-[200px] overflow-y-auto text-lg leading-relaxed font-medium"
            disabled={isGenerating || isComplete}
            rows={1}
          />
        </div>

        <button
          type="submit"
          aria-label="Send message"
          className={`group relative p-4 rounded-2xl font-semibold shadow-lg transition-all transform active:scale-95 flex items-center justify-center min-w-[60px] h-[60px] overflow-hidden ${
            !currentInput.trim() || isGenerating || isComplete
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              : "bg-gradient-to-br from-primary to-emerald-600 text-white hover:shadow-primary/25 hover:-translate-y-0.5"
          }`}
          disabled={!currentInput.trim() || isGenerating || isComplete}
        >
          {isGenerating ? (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
            </div>
          ) : (
            <>
              <Send className="w-6 h-6 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </>
          )}
        </button>
      </form>

      <div className="mt-4 flex justify-center gap-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-black">
        <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
          <div className="w-1 h-1 bg-primary rounded-full" />
          Neural Engine
        </span>
        <span className="flex items-center gap-1.5 hover:text-emerald-500 transition-colors cursor-default">
          <div className="w-1 h-1 bg-emerald-500 rounded-full" />
          ATS Intelligence
        </span>
        <span className="flex items-center gap-1.5 hover:text-amber-500 transition-colors cursor-default">
          <div className="w-1 h-1 bg-amber-500 rounded-full" />
          Semantic Match
        </span>
      </div>
    </div>
  );
}
