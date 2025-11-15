// src/components/resume/PreviewSkills.tsx
import { ResumeProfile } from "@/types";
import { VisibilityBadge } from "../VisibilityControls";

interface PreviewSkillsProps {
  profile: Partial<ResumeProfile>;
}

export const PreviewSkills = ({ profile }: PreviewSkillsProps) => {
  if (!profile.skills || profile.skills.length === 0) return null;

  return (
    <section>
      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        🎯 Skills
      </h3>
      <div className="flex flex-wrap gap-2">
        {profile.skills.map((skill, index) => (
          <div
            key={index}
            className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-full border border-indigo-200"
          >
            <span className="text-sm font-medium text-indigo-900">
              {skill.name}
            </span>
            {skill.level !== "intermediate" && (
              <span className="text-xs text-indigo-600 capitalize">
                ({skill.level})
              </span>
            )}
            <VisibilityBadge value={skill.visibility} />
          </div>
        ))}
      </div>
    </section>
  );
};
