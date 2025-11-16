"use client";

import type { ResumeProfile } from "@/types";
import { hasRequestItems } from "@/lib/utils/resumeVisibility";

interface ResumeEducationSectionProps {
  education: ResumeProfile["education"];
}

export function ResumeEducationSection({
  education,
}: ResumeEducationSectionProps) {
  const publicEducation = education.filter((e) => e.visibility === "public");
  const hasRequests = hasRequestItems(education);

  if (publicEducation.length === 0 && !hasRequests) {
    return null;
  }

  return (
    <section>
      <div className="space-y-12">
        {publicEducation.length > 0 ? (
          publicEducation.map((edu, index) => {
            // Check if degree field contains a long description (more than 100 chars)
            // If so, treat it as description instead
            const isLongDegree = edu.degree && edu.degree.length > 100;
            const degreeText = isLongDegree
              ? "Education & Background"
              : edu.degree;
            const descriptionText = isLongDegree ? edu.degree : edu.description;

            return (
              <div key={index} className="group">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                      {degreeText}
                    </h3>
                    {!isLongDegree && edu.institution && (
                      <p className="text-purple-400 font-semibold text-base mt-1">
                        {edu.institution}
                      </p>
                    )}
                  </div>
                </div>
                {!isLongDegree && (
                  <p className="text-slate-400 text-xs mb-4">
                    {edu.startDate} – {edu.endDate || "Present"}
                  </p>
                )}
                {descriptionText && (
                  <p className="text-slate-300 text-sm leading-relaxed font-normal">
                    {descriptionText}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-slate-400 text-sm italic">
            Education history is kept private.
          </p>
        )}
      </div>

      {hasRequests && (
        <div className="mt-8 px-4 py-3 rounded-lg bg-purple-900/20 border border-purple-500/30 backdrop-blur">
          <p className="text-purple-300 text-sm font-medium">
            Some education details require access approval.
          </p>
        </div>
      )}
    </section>
  );
}
