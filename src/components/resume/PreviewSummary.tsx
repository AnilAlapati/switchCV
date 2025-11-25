// src/components/resume/PreviewSummary.tsx
import { ResumeProfile } from "@/types";

interface PreviewSummaryProps {
  profile: Partial<ResumeProfile>;
}

export const PreviewSummary = ({ profile }: PreviewSummaryProps) => {
  if (!profile.summary) return null;

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        📝 Professional Summary
      </h3>
      <p className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
        {profile.summary}
      </p>
    </section>
  );
};
