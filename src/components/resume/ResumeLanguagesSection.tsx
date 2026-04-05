"use client";

import type { ResumeProfile } from "@/types";
import { hasRequestItems } from "@/lib/utils/resumeVisibility";

const PROFICIENCY_LABELS: Record<string, string> = {
  native: "Native",
  fluent: "Fluent",
  professional: "Professional Working",
  conversational: "Conversational",
  basic: "Basic",
};

interface ResumeLanguagesSectionProps {
  languages: NonNullable<ResumeProfile["languages"]>;
}

export function ResumeLanguagesSection({
  languages,
}: ResumeLanguagesSectionProps) {
  const publicLanguages = languages.filter((l) => l.visibility === "public");
  const hasRequests = hasRequestItems(languages);

  if (publicLanguages.length === 0 && !hasRequests) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-8 font-semibold">
        Languages
      </h2>
      {publicLanguages.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {publicLanguages.map((lang, index) => (
            <div
              key={lang.id || `lang-${index}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700"
            >
              <span className="text-white font-semibold text-sm">
                {lang.language}
              </span>
              <span className="text-slate-400 text-xs">
                {PROFICIENCY_LABELS[lang.proficiency] ?? lang.proficiency}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-sm italic">
          Languages are kept private.
        </p>
      )}

      {hasRequests && (
        <div className="mt-8 px-4 py-3 rounded-lg bg-teal-900/20 border border-teal-500/30 backdrop-blur">
          <p className="text-teal-300 text-sm font-medium">
            Some language details are available upon request.
          </p>
        </div>
      )}
    </section>
  );
}
