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
    <section className="space-y-4">
      <h3 className="text-2xl font-semibold text-cyan-400">Education</h3>
      <div className="space-y-4">
        {publicEducation.length > 0 ? (
          publicEducation.map((edu, index) => (
            <div key={index} className="border-l-4 border-purple-500 pl-6">
              <h4 className="text-xl font-semibold text-white">{edu.degree}</h4>
              <p className="text-purple-400 font-medium">{edu.institution}</p>
              <p className="text-slate-400 text-sm">
                {edu.startDate} - {edu.endDate || "Present"}
              </p>
              {edu.description && (
                <p className="text-slate-300 mt-2">{edu.description}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-sm">
            Education history is kept private.
          </p>
        )}
      </div>
      {hasRequests && (
        <p className="text-amber-200 text-sm">
          Some education details require access approval.
        </p>
      )}
    </section>
  );
}
