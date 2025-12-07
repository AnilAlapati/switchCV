"use client";

import { useEffect, useRef } from "react";

interface ResumeEditChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ResumeEditChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Describe the change—add a role, update a skill, or remove something...",
}: ResumeEditChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !disabled) {
      event.preventDefault();
      onSubmit(event as unknown as React.FormEvent);
    }
  };

  return (
    <div className="p-4 border-t border-white/40 bg-white/20 rounded-b-xl backdrop-blur-md">
      <form onSubmit={onSubmit} className="flex space-x-3 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 p-4 glass-input rounded-xl text-[#1A2F25] placeholder-[#2C4A3B]/40 focus:outline-none focus:ring-2 focus:ring-[#2C4A3B]/20 transition-all resize-none min-h-[80px] max-h-[200px] overflow-y-auto shadow-sm"
          disabled={disabled}
          rows={3}
        />
        <button
          type="submit"
          className="px-8 py-4 glass-button text-white rounded-xl font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] h-[80px]"
          disabled={disabled || !value.trim()}
        >
          {disabled ? (
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
              Working
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
