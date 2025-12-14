"use client";

import type { OpportunityInsight } from "@/types/dashboard";

interface OpportunityInsightsCardProps {
  title: string;
  subtitle?: string;
  insights: OpportunityInsight[];
}

const toneStyles: Record<OpportunityInsight["tone"], string> = {
  positive: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/10",
  info: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/10",
  caution: "from-amber-500/10 to-amber-500/5 border-amber-500/10",
};

const iconStyles: Record<OpportunityInsight["tone"], string> = {
  positive: "text-emerald-500",
  info: "text-cyan-500",
  caution: "text-amber-500",
};

export function OpportunityInsightsCard({
  title,
  subtitle,
  insights,
}: OpportunityInsightsCardProps) {
  return (
    <section className="glass-panel rounded-3xl p-6">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A2F25]">{title}</h2>
          {subtitle && <p className="text-sm text-[#1A2F25]/60 mt-1">{subtitle}</p>}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`group relative flex flex-col gap-4 rounded-2xl p-5 border bg-gradient-to-br transition-all hover:shadow-lg ${toneStyles[insight.tone]} hover:border-opacity-40`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider opacity-80 ${iconStyles[insight.tone]}`}>
                {insight.metricLabel}
              </span>
            </div>

            <div>
              <p className="text-3xl font-bold text-[#1A2F25] mb-4">
                {insight.metricValue}
              </p>

              <h3 className="text-base font-bold text-[#1A2F25] mb-2">
                {insight.title}
              </h3>

              <p className="text-sm text-[#1A2F25]/70 leading-relaxed">
                {insight.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
