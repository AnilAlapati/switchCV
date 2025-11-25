"use client";

import React from "react";

interface ResumeGenerationLoaderProps {
  status?: "generating" | "saving" | "complete";
  message?: string;
}

export const ResumeGenerationLoader: React.FC<ResumeGenerationLoaderProps> = ({
  status = "generating",
  message = "Generating your professional resume with AI...",
}) => {
  const getProgressPercentage = () => {
    switch (status) {
      case "generating":
        return 50;
      case "saving":
        return 85;
      case "complete":
        return 100;
      default:
        return 0;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case "generating":
        return "🤖 AI is enhancing your resume...";
      case "saving":
        return "💾 Saving to your profile...";
      case "complete":
        return "✅ Resume created successfully!";
      default:
        return message;
    }
  };

  const progress = getProgressPercentage();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 h-screen flex flex-col items-center justify-center">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* Animated Spinner */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-24 h-24">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />

            {/* Middle pulsing ring */}
            <div className="absolute inset-2 rounded-full border-2 border-blue-500/30 border-r-blue-500 animate-[spin_2s_linear_reverse]" />

            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 animate-pulse" />

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center text-3xl">
              ✨
            </div>
          </div>
        </div>

        {/* Status Message */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-3">
          {getStatusMessage()}
        </h1>

        <p className="text-gray-400 text-lg mb-12 max-w-lg mx-auto">
          {message}
        </p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm font-semibold text-cyan-400">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-500 ease-out rounded-full shadow-lg shadow-cyan-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading Steps */}
        <div className="space-y-3 mb-8">
          {/* Step 1: Generating */}
          <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              status === "generating" ||
              status === "saving" ||
              status === "complete"
                ? "bg-green-900/20 border border-green-500/50"
                : "bg-gray-700/30 border border-gray-600/50"
            }`}
          >
            <span
              className={`text-lg ${
                status === "generating" ||
                status === "saving" ||
                status === "complete"
                  ? "text-green-400"
                  : "text-gray-400"
              }`}
            >
              {status === "generating" ? "⏳" : "✓"}
            </span>
            <span
              className={`text-sm ${
                status === "generating" ||
                status === "saving" ||
                status === "complete"
                  ? "text-green-300"
                  : "text-gray-400"
              }`}
            >
              Enhancing content with AI
            </span>
          </div>

          {/* Step 2: Saving */}
          <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              status === "saving" || status === "complete"
                ? "bg-green-900/20 border border-green-500/50"
                : "bg-gray-700/30 border border-gray-600/50"
            }`}
          >
            <span
              className={`text-lg ${
                status === "saving" || status === "complete"
                  ? "text-green-400"
                  : "text-gray-400"
              }`}
            >
              {status === "saving" ? "⏳" : status === "complete" ? "✓" : "○"}
            </span>
            <span
              className={`text-sm ${
                status === "saving" || status === "complete"
                  ? "text-green-300"
                  : "text-gray-400"
              }`}
            >
              Saving to your profile
            </span>
          </div>

          {/* Step 3: Complete */}
          <div
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              status === "complete"
                ? "bg-green-900/20 border border-green-500/50"
                : "bg-gray-700/30 border border-gray-600/50"
            }`}
          >
            <span
              className={`text-lg ${
                status === "complete" ? "text-green-400" : "text-gray-400"
              }`}
            >
              {status === "complete" ? "✓" : "○"}
            </span>
            <span
              className={`text-sm ${
                status === "complete" ? "text-green-300" : "text-gray-400"
              }`}
            >
              Getting your profile ready
            </span>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-4 text-left">
          <p className="text-cyan-300 text-sm">
            💡 <strong>Pro Tip:</strong> Your resume will be available at a
            shareable URL. You can share it with recruiters and control who sees
            what information.
          </p>
        </div>
      </div>
    </div>
  );
};
