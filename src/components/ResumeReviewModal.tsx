"use client";

import React, { useState, useMemo } from "react";
import { Resume } from "@/lib/resumeComparison.types";
import { TemplateRenderer } from "./resume/TemplateRenderer";
import type { ResumeProfile, ResumeTemplate } from "@/types";

interface ResumeReviewModalProps {
  resume: Resume;
  isOpen: boolean;
  onAccept: () => Promise<void>;
  onRewrite: (feedback: string) => Promise<void>;
  isLoading?: boolean;
  retryCount?: number;
  maxRetries?: number;
  /** Template ID to use for preview (defaults to "clarity-v1") */
  templateId?: string;
}

/** Default template used for the review preview */
const DEFAULT_PREVIEW_TEMPLATE: ResumeTemplate = {
  id: "clarity-v1",
  name: "Clarity",
  description: "Clean professional layout",
  sections: [],
};

/**
 * Convert the lightweight Resume type (used in creation flow)
 * to the full ResumeProfile type (used by TemplateRenderer).
 */
function resumeToProfile(resume: Resume): ResumeProfile {
  return {
    versionId: resume.id,
    templateId: "clarity-v1",
    title: resume.title,
    summary: resume.summary ?? "",
    slug: resume.id,
    lastUpdatedAt: new Date().toISOString(),
    skills: (resume.skills ?? []).map((s) => ({
      name: s,
      level: "intermediate",
      visibility: "public" as const,
    })),
    experience: (resume.experience ?? []).map((exp) => ({
      company: exp.company,
      role: exp.role,
      startDate: exp.startDate ?? exp.duration,
      endDate: exp.endDate,
      description: exp.description,
      visibility: "public" as const,
    })),
    education: (resume.education ?? []).map((edu) => ({
      institution: edu.institution,
      degree: `${edu.degree}${edu.field ? ` in ${edu.field}` : ""}`,
      startDate: String(edu.year),
      description: edu.gpa ? `GPA: ${edu.gpa}` : undefined,
      visibility: "public" as const,
    })),
    projects: [],
    contact: {
      email: {
        value: resume.contact?.email?.value ?? "",
        visibility: "public" as const,
      },
      phone: resume.contact?.phone
        ? { value: resume.contact.phone.value, visibility: "public" as const }
        : undefined,
    },
    personalInfo: {
      name: resume.title.replace("'s Resume", ""),
      email: resume.contact?.email?.value ?? "",
      phone: resume.contact?.phone?.value,
    },
    generatedText: {
      draft: "",
      polished: "",
      lastGeneratedAt: new Date().toISOString(),
    },
  };
}

export const ResumeReviewModal: React.FC<ResumeReviewModalProps> = ({
  resume,
  isOpen,
  onAccept,
  onRewrite,
  isLoading = false,
  retryCount = 0,
  maxRetries = 5,
  templateId,
}) => {
  const [feedback, setFeedback] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);

  const profileData = useMemo(() => resumeToProfile(resume), [resume]);
  const template = useMemo<ResumeTemplate>(
    () =>
      templateId
        ? { ...DEFAULT_PREVIEW_TEMPLATE, id: templateId }
        : DEFAULT_PREVIEW_TEMPLATE,
    [templateId],
  );

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
    (_, i) => i < retryCount,
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 my-8">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Review Your AI-Generated Resume
              </h2>
              <p className="text-gray-500 text-sm">
                This is exactly how your resume will look. Edit or regenerate
                sections with AI.
              </p>
            </div>

            {/* Retry Counter */}
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Rewrites remaining</p>
                <div className="flex gap-1">
                  {retryIndicators.map((used, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${
                        used ? "bg-red-400" : "bg-blue-500"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-lg font-semibold text-blue-600">
                {remainingRetries}/{maxRetries}
              </span>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row max-h-[70vh] overflow-hidden">
          {/* Resume Preview — uses the real template engine */}
          <div className="flex-1 overflow-y-auto border-r border-gray-200 p-4 bg-white">
            <TemplateRenderer
              template={template}
              data={profileData}
              isAuthenticated={true}
            />
          </div>

          {/* Feedback Panel */}
          <div className="w-full lg:w-96 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Refine Your Resume
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Tell us what to improve and we&apos;ll regenerate with AI
            </p>

            {/* Textarea */}
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="E.g., 'Make summary more concise', 'Highlight leadership skills'..."
              className="flex-1 p-4 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none mb-4"
              disabled={rewriteLoading || !remainingRetries}
              aria-label="Resume feedback"
              aria-describedby="feedback-char-count"
            />

            {/* Character Count */}
            <div
              id="feedback-char-count"
              className="text-xs text-gray-500 mb-4"
            >
              {feedback.length} characters · {remainingRetries} rewrites left
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={acceptLoading || isLoading}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {acceptLoading ? (
                  <>
                    <span className="animate-spin" role="status">
                      ⏳
                    </span>
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
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rewriteLoading ? (
                  <>
                    <span className="animate-spin" role="status">
                      ⏳
                    </span>
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
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
                  Max rewrites reached. Accept this version or start over.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
