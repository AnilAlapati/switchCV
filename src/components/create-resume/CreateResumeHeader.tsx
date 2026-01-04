"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface AIConnectionStatus {
  connected: boolean;
  model?: string;
}

interface CreateResumeHeaderProps {
  aiConnectionStatus?: AIConnectionStatus | null;
}

export function CreateResumeHeader({
  aiConnectionStatus,
}: CreateResumeHeaderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`border-b border-white/20 bg-card/30 backdrop-blur-md transition-all duration-300 ${
        isCollapsed ? "p-2" : "p-6"
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {isCollapsed ? (
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">Switch</span>
              <span className="text-lg font-bold text-foreground">CV</span>
            </div>
            {aiConnectionStatus && (
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  aiConnectionStatus.connected
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                }`}
              >
                {aiConnectionStatus.connected
                  ? `✓ ${aiConnectionStatus.model}`
                  : "⚠️"}
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1 rounded-md hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
              aria-label="Expand header"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-primary">
                    Switch
                  </span>
                  <span className="text-3xl font-bold text-foreground">CV</span>
                </div>
                <span className="text-muted-foreground/50 text-xl">|</span>
                <span className="text-xl font-semibold text-muted-foreground">
                  AI Resume Builder
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                Create your professional resume with AI assistance
              </p>
            </div>
            <div className="flex items-center gap-3">
              {aiConnectionStatus && (
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    aiConnectionStatus.connected
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-red-100 text-red-700 border border-red-200"
                  }`}
                >
                  {aiConnectionStatus.connected
                    ? `✓ ${aiConnectionStatus.model} Connected`
                    : "⚠️ AI Unavailable"}
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded-md hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                aria-label="Collapse header"
                title="Minimize header for cleaner view"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
