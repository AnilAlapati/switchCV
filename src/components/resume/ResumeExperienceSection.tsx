"use client";

import type { ResumeProfile } from "@/types";
import { hasRequestItems, hasMaskedItems } from "@/lib/utils/resumeVisibility";

interface ResumeExperienceSectionProps {
  experience: ResumeProfile["experience"];
  enhancedExperience?: Record<string, { enhancedDescription: string }>;
}

export function ResumeExperienceSection({
  experience,
  enhancedExperience,
}: ResumeExperienceSectionProps) {
  const publicExperience = experience.filter((e) => e.visibility === "public");
  const experienceVisibility = {
    request: experience.filter((e) => e.visibility === "request").length,
    masked: experience.filter((e) => e.visibility === "masked").length,
  };

  if (publicExperience.length === 0 && experienceVisibility.request === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <h3 className="text-2xl font-semibold text-cyan-400">Experience</h3>
      <div className="space-y-6">
        {publicExperience.length > 0 ? (
          publicExperience.map((exp, index) => (
            <div key={index} className="border-l-4 border-cyan-500 pl-6">
              <h4 className="text-xl font-semibold text-white">{exp.role}</h4>
              <p className="text-purple-400 font-medium">{exp.company}</p>
              <p className="text-slate-400 text-sm mb-2">
                {exp.startDate} - {exp.endDate || "Present"}
              </p>
              <p className="text-slate-300 leading-relaxed">
                {enhancedExperience?.[index]?.enhancedDescription ||
                  exp.description}
              </p>
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-sm">
            Experience entries are protected for privacy.
          </p>
        )}
      </div>
      {hasRequestItems(experience) && (
        <p className="text-amber-200 text-sm">
          Additional experience details are available upon request.
        </p>
      )}
      {hasMaskedItems(experience) && (
        <p className="text-slate-400 text-sm">
          Some experience entries are hidden to protect sensitive work.
        </p>
      )}
    </section>
  );
}
