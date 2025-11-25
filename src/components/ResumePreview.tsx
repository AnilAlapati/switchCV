// src/components/ResumePreview.tsx
"use client";

import { ResumeProfile } from "@/types";
import { PreviewHeader } from "./resume/PreviewHeader";
import { PreviewSummary } from "./resume/PreviewSummary";
import { PreviewExperience } from "./resume/PreviewExperience";
import { PreviewEducation } from "./resume/PreviewEducation";
import { PreviewSkills } from "./resume/PreviewSkills";
import { PreviewProjects } from "./resume/PreviewProjects";
import { PreviewContact } from "./resume/PreviewContact";

interface ResumePreviewProps {
  profile: Partial<ResumeProfile>;
  compact?: boolean;
}

/**
 * ResumePreview Component
 *
 * Displays a live preview of the resume being edited.
 * Shows all sections with real-time updates as the user edits.
 */
export const ResumePreview = ({
  profile,
  compact = false,
}: ResumePreviewProps) => {
  if (
    !profile.title &&
    !profile.summary &&
    (profile.experience || []).length === 0
  ) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <p className="text-gray-500">
          👀 Your resume preview will appear here as you fill in the form
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
        !compact && "shadow-lg"
      }`}
    >
      <PreviewHeader profile={profile} />

      <div className="px-6 py-8 space-y-8">
        <PreviewSummary profile={profile} />
        <PreviewExperience profile={profile} />
        <PreviewEducation profile={profile} />
        <PreviewSkills profile={profile} />
        <PreviewProjects profile={profile} />
        <PreviewContact profile={profile} />
      </div>
    </div>
  );
};

/**
 * ResumePreviewPanel Component
 *
 * Displays the resume preview in a two-column layout.
 * Form on the left, preview on the right (desktop) or stacked (mobile).
 */
export const ResumePreviewPanel = ({
  profile,
  children,
}: {
  profile: Partial<ResumeProfile>;
  children: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="lg:max-h-screen lg:overflow-y-auto">{children}</div>

      {/* Preview */}
      <div className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-gray-700">
            👁️ Live Preview
          </div>
          <ResumePreview profile={profile} />
        </div>
      </div>
    </div>
  );
};
