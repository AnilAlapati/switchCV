"use client";

import React, { useState } from "react";
import type { EnhancedResumeContent } from "@/lib/resumeGenerator";
import { FuturisticResumeDisplay } from "./FuturisticResumeDisplay";

interface ResumeReviewModalProps {
  generatedResume: EnhancedResumeContent;
  aiModelUsed: string;
  onAccept: () => Promise<void>;
  onRewrite: (feedback: string) => Promise<void>;
  retryCount: number;
  maxRetries: number;
  isLoading: boolean;
}

export const ResumeReviewModal: React.FC<ResumeReviewModalProps> = ({
  generatedResume,
  aiModelUsed,
  onAccept,
  onRewrite,
  retryCount,
  maxRetries,
  isLoading,
}) => {
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const retriesRemaining = maxRetries - retryCount;

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRewrite = async () => {
    if (!feedback.trim()) {
      alert("Please provide feedback for the rewrite");
      return;
    }
    await onRewrite(feedback);
    setFeedback("");
    setShowFeedback(false);
  };

  const isLastRetry = retriesRemaining === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      {/* Scrollable Container */}
      <div className="w-full h-full max-h-screen overflow-y-auto flex items-start justify-center py-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Review Your Resume
              </h2>
              <p className="text-gray-400 text-sm">
                {retriesRemaining === maxRetries
                  ? "Review your AI-generated resume and provide feedback if needed"
                  : `${retriesRemaining} rewrite${
                      retriesRemaining === 1 ? "" : "s"
                    } remaining`}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-2">Retry Progress</div>
              <div className="flex gap-1.5">
                {Array.from({ length: maxRetries }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < retryCount ? "bg-cyan-500 scale-125" : "bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Resume Display */}
          <div className="mb-6">
            <FuturisticResumeDisplay
              generatedResume={generatedResume}
              aiModelUsed={aiModelUsed}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleAccept}
              disabled={isLoading || isAccepting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-green-900 disabled:to-emerald-900 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 disabled:shadow-none"
            >
              {isAccepting ? (
                <>
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Accepting...
                </>
              ) : (
                <>
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Accept & Save Resume
                </>
              )}
            </button>

            <button
              onClick={() => setShowFeedback(!showFeedback)}
              disabled={isLoading || retriesRemaining === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:shadow-none"
            >
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Rewrite {retriesRemaining > 0 && `(${retriesRemaining})`}
            </button>
          </div>

          {/* Feedback Section */}
          {showFeedback && (
            <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-6 mb-6 backdrop-blur-sm">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                What would you like to change?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="E.g., 'Add more emphasis on leadership skills', 'Make the summary more concise', 'Highlight technical certifications'..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-blue-500/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
                rows={4}
                disabled={isLoading}
              />

              {isLastRetry && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-amber-300 text-sm font-medium">
                    ⚠️ This is your last rewrite. Make sure your feedback
                    counts!
                  </p>
                </div>
              )}

              <button
                onClick={handleRewrite}
                disabled={isLoading || !feedback.trim()}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Rewriting Resume...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Regenerate with Feedback
                  </>
                )}
              </button>
            </div>
          )}

          {/* Retries Exhausted Message */}
          {retriesRemaining === 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-6">
              <p className="text-red-300 text-sm">
                <span className="font-semibold">No rewrites remaining.</span>{" "}
                You can still accept this resume or start over.
              </p>
            </div>
          )}

          {/* Info Message */}
          <div className="text-center text-sm text-gray-400">
            <p>
              Our AI intelligently learns from your feedback to improve the
              resume with each iteration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
