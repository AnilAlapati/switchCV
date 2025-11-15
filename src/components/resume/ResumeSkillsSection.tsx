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
      <h3 className="text-2xl font-semibold text-cyan-400 mb-4">Skills</h3>
      <div className="flex flex-wrap gap-3">
        {publicSkills.map((skill, index) => (
          <span
            key={index}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 rounded-full text-cyan-300 font-medium"
          >
            {skill.name} • {skill.level}
          </span>
        ))}
        {(hasMaskedItems(skills) || hasRequestItems(skills)) && (
          <span className="px-4 py-2 border border-slate-500 rounded-full text-slate-400 text-sm">
            Additional skills are protected
          </span>
        )}
        {skillSuggestions?.map((skill, index) => (
          <span
            key={`suggested-${index}`}
            className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-full text-green-300 font-medium"
          >
            {skill} (Suggested)
          </span>
        ))}
      </div>
    </section>
  );
}
