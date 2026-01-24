"use client";

import type { ResumeProfile } from "@/types";
import { renderContactField } from "@/lib/utils/resumeVisibility";

interface ResumeContactSectionProps {
  resume: ResumeProfile;
}

export function ResumeContactSection({ resume }: ResumeContactSectionProps) {
  const hasPhone = resume.contact.phone?.value;

  return (
    <div className="space-y-8">
      {/* Email */}
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
          Email
        </p>
        <p className="text-slate-200 font-medium break-all hover:text-blue-400 transition-colors cursor-pointer">
          {renderContactField(
            resume.contact.email.value,
            resume.contact.email.visibility,
            "email",
          )}
        </p>
      </div>

      {/* Phone */}
      {hasPhone && resume.contact.phone && (
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
            Phone
          </p>
          <p className="text-slate-200 font-medium hover:text-blue-400 transition-colors cursor-pointer">
            {renderContactField(
              resume.contact.phone.value,
              resume.contact.phone.visibility,
              "phone",
            )}
          </p>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-slate-600/50 to-transparent"></div>

      {/* About/Summary */}
      {resume.summary && (
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">
            About
          </p>
          <p className="text-slate-300 text-sm leading-relaxed font-normal">
            {resume.summary}
          </p>
        </div>
      )}
    </div>
  );
}
