// src/components/resume/PreviewExperience.tsx
import { ResumeProfile } from "@/types";
import { VisibilityBadge } from "../VisibilityControls";

interface PreviewExperienceProps {
  profile: Partial<ResumeProfile>;
}

export const PreviewExperience = ({ profile }: PreviewExperienceProps) => {
  if (!profile.experience || profile.experience.length === 0) return null;

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        💼 Work Experience
      </h3>
      <div className="space-y-4">
        {profile.experience.map((exp, index) => (
          <div key={index} className="border-l-4 border-indigo-600 pl-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h4 className="font-semibold text-gray-900">{exp.role}</h4>
                <p className="text-purple-600 text-sm">{exp.company}</p>
              </div>
              <VisibilityBadge value={exp.visibility} />
            </div>
            <p className="text-gray-600 text-xs sm:text-sm mb-2">
              {exp.startDate} {exp.endDate && `- ${exp.endDate}`}
            </p>
            {exp.description && (
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {exp.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
