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
    <section>
      <div className="space-y-12">
        {publicExperience.length > 0 ? (
          publicExperience.map((exp, index) => (
            <div key={exp.id || `exp-${index}`} className="group">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {exp.role}
                  </h3>
                  <p className="text-blue-400 font-semibold text-base mt-1">
                    {exp.company}
                  </p>
                </div>
              </div>
              <p className="text-slate-400 text-xs mb-4">
                {exp.startDate} – {exp.endDate || "Present"}
              </p>
              <p className="text-slate-300 text-sm leading-relaxed font-normal">
                {enhancedExperience?.[index]?.enhancedDescription ||
                  exp.description}
              </p>
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-sm italic">
            Experience entries are protected for privacy.
          </p>
        )}
      </div>

      {hasRequestItems(experience) && (
        <div className="mt-8 px-4 py-3 rounded-lg bg-blue-900/20 border border-blue-500/30 backdrop-blur">
          <p className="text-blue-300 text-sm font-medium">
            Additional experience details are available upon request.
          </p>
        </div>
      )}

      {hasMaskedItems(experience) && (
        <p className="text-slate-500 text-sm mt-6">
          Some experience entries are hidden to protect sensitive work.
        </p>
      )}
    </section>
  );
}
