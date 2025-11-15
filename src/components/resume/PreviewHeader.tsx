// src/components/resume/PreviewHeader.tsx
import { ResumeProfile } from "@/types";

interface PreviewHeaderProps {
  profile: Partial<ResumeProfile>;
}

export const PreviewHeader = ({ profile }: PreviewHeaderProps) => {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-8">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2">
        {profile.title || "Resume Title"}
      </h2>
      {profile.summary && (
        <p className="text-indigo-100 text-sm sm:text-base line-clamp-2">
          {profile.summary}
        </p>
      )}
    </div>
  );
};
