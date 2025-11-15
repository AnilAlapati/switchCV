"use client";

import type { ResumeProfile } from "@/types";
import { renderContactField } from "@/lib/utils/resumeVisibility";

interface ResumeContactSectionProps {
  resume: ResumeProfile;
}

export function ResumeContactSection({ resume }: ResumeContactSectionProps) {
  const hasPhone = resume.contact.phone.value;

  return (
    <div>
      <div className="text-center mb-4">
        <h2 className="text-3xl font-semibold text-white">
          {resume.contact.email.visibility === "public"
            ? resume.contact.email.value.split("@")[0]
            : "Private Candidate"}
        </h2>
        <div className="flex flex-wrap justify-center gap-4 text-slate-300">
          <span>
            📧{" "}
            {renderContactField(
              resume.contact.email.value,
              resume.contact.email.visibility,
              "email"
            )}
          </span>
          {hasPhone && (
            <span>
              📱{" "}
              {renderContactField(
                resume.contact.phone.value,
                resume.contact.phone.visibility,
                "phone"
              )}
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-2xl font-semibold text-cyan-400 mb-4">
          Professional Summary
        </h3>
        <p className="text-slate-300 leading-relaxed">{resume.summary}</p>
      </div>
    </div>
  );
}
