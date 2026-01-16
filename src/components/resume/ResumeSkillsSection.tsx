"use client";

import type { ResumeProfile } from "@/types";
import { hasRequestItems, hasMaskedItems } from "@/lib/utils/resumeVisibility";

interface ResumeSkillsSectionProps {
  skills: ResumeProfile["skills"];
  skillSuggestions?: string[];
}

export function ResumeSkillsSection({
  skills,
  skillSuggestions,
}: ResumeSkillsSectionProps) {
  const publicSkills = skills.filter((s) => s.visibility === "public");

  if (publicSkills.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="space-y-10">
        {/* Public Skills */}
        <div>
          <h4 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-6">
            Technical Skills
          </h4>
          <div className="flex flex-wrap gap-3">
            {publicSkills.map((skill, index) => (
              <div
                key={skill.id || `skill-${index}`}
                className="group px-3 py-2 rounded-lg bg-slate-700/40 border border-slate-600/60 hover:border-blue-500/60 hover:bg-slate-700/60 transition-all"
              >
                <p className="text-slate-300 group-hover:text-blue-300 transition-colors text-sm font-medium">
                  {skill.name}
                </p>
                <p className="text-slate-500 group-hover:text-slate-400 text-xs mt-1">
                  {skill.level}
                </p>
              </div>
            ))}
            {(hasMaskedItems(skills) || hasRequestItems(skills)) && (
              <div className="px-3 py-2 rounded-lg border border-slate-600/40 text-slate-400 text-sm">
                +More (Protected)
              </div>
            )}
          </div>
        </div>

        {/* Suggested Skills */}
        {skillSuggestions && skillSuggestions.length > 0 && (
          <div>
            <h4 className="text-sm uppercase tracking-widest text-slate-400 font-semibold mb-6">
              Suggested Skills
            </h4>
            <div className="flex flex-wrap gap-3">
              {skillSuggestions.map((skill, index) => (
                <div
                  key={`suggested-${index}`}
                  className="px-3 py-2 rounded-lg bg-green-900/30 border border-green-500/40 hover:border-green-400/60 transition-all"
                >
                  <span className="text-green-300 text-sm font-medium">
                    {skill}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
