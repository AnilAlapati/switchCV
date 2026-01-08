// src/components/resume/PreviewEducation.tsx
import { ResumeProfile } from "@/types";
import { VisibilityBadge } from "../VisibilityControls";

interface PreviewEducationProps {
  profile: Partial<ResumeProfile>;
}

export const PreviewEducation = ({ profile }: PreviewEducationProps) => {
  if (!profile.education || profile.education.length === 0) return null;

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        🎓 Education
      </h3>
      <div className="space-y-4">
        {profile.education.map((edu, index) => (
          <div key={edu.id || `edu-${index}`} className="border-l-4 border-purple-600 pl-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h4 className="font-semibold text-gray-900">{edu.degree}</h4>
                <p className="text-purple-600 text-sm">{edu.institution}</p>
              </div>
              <VisibilityBadge value={edu.visibility} />
            </div>
            {edu.startDate && (
              <p className="text-gray-600 text-xs sm:text-sm mb-2">
                {edu.startDate} {edu.endDate && `- ${edu.endDate}`}
              </p>
            )}
            {edu.description && (
              <p className="text-gray-700 text-sm leading-relaxed">
                {edu.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
