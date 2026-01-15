"use client";

import type { ReactElement } from "react";
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
}: CreateResumeHeaderProps): ReactElement {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`border-b-2 border-black bg-white transition-all duration-300 ${isCollapsed ? "p-2" : "p-6"
        }`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {isCollapsed ? (
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-serif font-bold text-black">Switch</span>
              <span className="text-lg font-serif font-bold text-gray-600">CV</span>
            </div>
            {aiConnectionStatus && (
              <div
                className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${aiConnectionStatus.connected
                  ? "bg-blue-50 text-blue-700 border-2 border-blue-200"
                  : "bg-red-50 text-red-700 border-2 border-red-200"
                  }`}
              >
                {aiConnectionStatus.connected
                  ? `✓ ${aiConnectionStatus.model}`
                  : "⚠️"}
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1 hover:bg-gray-100 transition-colors text-gray-500 hover:text-black border border-gray-200"
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
                  <span className="text-3xl font-serif font-bold text-black">
                    Switch
                  </span>
                  <span className="text-3xl font-serif font-bold text-gray-600">CV</span>
                </div>
                <span className="text-gray-300 text-xl">|</span>
                <span className="text-xl font-mono font-bold text-gray-500 uppercase tracking-wider">
                  AI Resume Builder
                </span>
              </div>
              <p className="text-gray-500 text-sm font-sans">
                Create your professional resume with AI assistance
              </p>
            </div>
            <div className="flex items-center gap-3">
              {aiConnectionStatus && (
                <div
                  className={`px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${aiConnectionStatus.connected
                    ? "bg-blue-50 text-blue-700 border-2 border-blue-200"
                    : "bg-red-50 text-red-700 border-2 border-red-200"
                    }`}
                >
                  {aiConnectionStatus.connected
                    ? `✓ ${aiConnectionStatus.model} Connected`
                    : "⚠️ AI Unavailable"}
                </div>
              )}
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 hover:bg-gray-100 transition-colors text-gray-500 hover:text-black border border-gray-200"
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
