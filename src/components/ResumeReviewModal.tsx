"use client";

import React, { useState } from "react";
import { Resume } from "@/lib/resumeComparison.types";

interface ResumeReviewModalProps {
  resume: Resume;
  isOpen: boolean;
  onAccept: () => Promise<void>;
  onRewrite: (feedback: string) => Promise<void>;
  isLoading?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export const ResumeReviewModal: React.FC<ResumeReviewModalProps> = ({
  resume,
  isOpen,
  onAccept,
  onRewrite,
  isLoading = false,
  retryCount = 0,
  maxRetries = 5,
}) => {
  const [feedback, setFeedback] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    setAcceptLoading(true);
    try {
      await onAccept();
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleRewrite = async () => {
    if (!feedback.trim()) {
      alert("Please provide feedback for the rewrite");
      return;
    }
    setRewriteLoading(true);
    try {
      await onRewrite(feedback);
      setFeedback("");
    } finally {
      setRewriteLoading(false);
    }
  };

  const remainingRetries = maxRetries - retryCount;
  const retryIndicators = Array.from(
    { length: maxRetries },
    (_, i) => i < retryCount
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-cyan-500/30 my-8">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border-b border-cyan-500/20 px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                Review Your AI-Generated Resume
              </h2>
              <p className="text-gray-400 text-sm">
                Edit, customize, or regenerate sections with AI assistance
              </p>
            </div>

            {/* Retry Counter */}
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Rewrites remaining</p>
                <div className="flex gap-1">
                  {retryIndicators.map((used, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${
                        used ? "bg-red-500" : "bg-cyan-500"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-lg font-semibold text-cyan-400">
                {remainingRetries}/{maxRetries}
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row max-h-[70vh] overflow-hidden">
          {/* Resume Preview */}
          <div className="flex-1 overflow-y-auto border-r border-cyan-500/20 p-6 bg-gray-800/30">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-cyan-400 mb-2">
                  {resume.title}
                </h3>
              </div>

              {/* Summary */}
              {resume.summary && (
                <div>
                  <h4 className="text-lg font-semibold text-cyan-300 mb-2 flex items-center gap-2">
                    <span>👤</span>
                    Summary
                  </h4>
                  <p className="text-gray-300 leading-relaxed bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                    {resume.summary}
                  </p>
                </div>
              )}

              {/* Skills */}
              {resume.skills && resume.skills.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                    <span>⚡</span>
                    Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/50 rounded-full text-sm text-cyan-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {resume.experience && resume.experience.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                    <span>💼</span>
                    Experience
                  </h4>
                  <div className="space-y-3">
                    {resume.experience.map((exp, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-semibold text-white">
                              {exp.role}
                            </h5>
                            <p className="text-cyan-300 text-sm">
                              {exp.company}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {resume.education && resume.education.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                    <span>🎓</span>
                    Education
                  </h4>
                  <div className="space-y-3">
                    {resume.education.map((edu, idx: number) => (
                      <div
                        key={idx}
                        className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50"
                      >
                        <h5 className="font-semibold text-white">
                          {edu.degree} in {edu.field}
                        </h5>
                        <p className="text-cyan-300 text-sm">
                          {edu.institution}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          Class of {edu.year}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Panel */}
          <div className="w-full lg:w-96 bg-gray-900/50 border-t lg:border-t-0 lg:border-l border-cyan-500/20 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2">
              Refine Your Resume
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Tell us what to improve and we'll regenerate with AI
            </p>

            {/* Textarea */}
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="E.g., 'Make summary more concise', 'Highlight leadership skills'..."
              className="flex-1 p-4 bg-gray-800 border border-cyan-500/30 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 resize-none mb-4"
              disabled={rewriteLoading || !remainingRetries}
            />

            {/* Character Count */}
            <div className="text-xs text-gray-400 mb-4">
              {feedback.length} characters · {remainingRetries} rewrites left
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={acceptLoading || isLoading}
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acceptLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Accept & Save
                  </>
                )}
              </button>

              <button
                onClick={handleRewrite}
                disabled={
                  rewriteLoading ||
                  isLoading ||
                  !feedback.trim() ||
                  !remainingRetries
                }
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rewriteLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Rewrite with AI
                  </>
                )}
              </button>

              {!remainingRetries && (
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 text-sm text-yellow-300">
                  ⚠️ Max rewrites reached. Accept this version or start over.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
