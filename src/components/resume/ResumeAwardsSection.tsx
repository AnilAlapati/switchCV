"use client";

import type { ResumeProfile } from "@/types";
import { hasRequestItems } from "@/lib/utils/resumeVisibility";

interface ResumeAwardsSectionProps {
  awards: NonNullable<ResumeProfile["awards"]>;
}

export function ResumeAwardsSection({ awards }: ResumeAwardsSectionProps) {
  const publicAwards = awards.filter((a) => a.visibility === "public");
  const hasRequests = hasRequestItems(awards);

  if (publicAwards.length === 0 && !hasRequests) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-8 font-semibold">
        Awards &amp; Honors
      </h2>
      <div className="space-y-8">
        {publicAwards.length > 0 ? (
          publicAwards.map((award, index) => (
            <div key={award.id || `award-${index}`} className="group">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    {award.title}
                  </h3>
                  <p className="text-orange-400 font-semibold text-base mt-1">
                    {award.issuer}
                  </p>
                </div>
                {award.date && (
                  <span className="text-slate-400 text-xs whitespace-nowrap flex-shrink-0 mt-1">
                    {award.date}
                  </span>
                )}
              </div>
              {award.description && (
                <p className="text-slate-300 text-sm leading-relaxed font-normal mt-2">
                  {award.description}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-slate-400 text-sm italic">
            Awards are kept private.
          </p>
        )}
      </div>

      {hasRequests && (
        <div className="mt-8 px-4 py-3 rounded-lg bg-orange-900/20 border border-orange-500/30 backdrop-blur">
          <p className="text-orange-300 text-sm font-medium">
            Some awards are available upon request.
          </p>
        </div>
      )}
    </section>
  );
}
