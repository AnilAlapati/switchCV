"use client";

interface CreateResumeInputFormProps {
  currentInput: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  stage: string;
}

import { useRef, useEffect } from "react";

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

  return (
    <div className="p-4 border-t border-gray-700/50 bg-gray-800/20 backdrop-blur-sm rounded-b-xl">
      <form onSubmit={onSubmit} className="flex space-x-3 items-end">
        <textarea
          ref={textareaRef}
          value={currentInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            stage === "generating"
              ? "✨ Generating your resume..."
              : stage === "complete"
              ? "✓ Resume ready! Check above."
              : "Tell me about your experience, skills, or job goals..."
          }
          className="flex-1 p-4 bg-gray-800/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none min-h-[56px] max-h-[200px] overflow-y-auto"
          disabled={stage === "generating" || stage === "complete"}
          rows={1}
        />
        <button
          type="submit"
          className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] h-[56px]"
          disabled={
            !currentInput.trim() ||
            stage === "generating" ||
            stage === "complete"
          }
        >
          {stage === "generating" ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Send
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
