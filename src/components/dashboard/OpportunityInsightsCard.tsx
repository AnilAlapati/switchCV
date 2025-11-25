"use client";

import type { OpportunityInsight } from "@/types/dashboard";

interface OpportunityInsightsCardProps {
  title: string;
  subtitle?: string;
  insights: OpportunityInsight[];
}

const toneAccent: Record<OpportunityInsight["tone"], string> = {
  positive: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30",
  info: "bg-cyan-500/15 text-cyan-200 border border-cyan-500/30",
  caution: "bg-amber-500/15 text-amber-200 border border-amber-500/30",
};

export function OpportunityInsightsCard({
  title,
  subtitle,
  insights,
}: OpportunityInsightsCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
      <header className="mb-5 space-y-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-slate-300">{subtitle}</p>}
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`flex flex-col gap-4 rounded-xl p-4 transition hover:border-cyan-500/30 hover:bg-slate-900/80 ${
              toneAccent[insight.tone]
            }`}
          >
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-300/80">
                {insight.metricLabel}
              </span>
              <p className="text-2xl font-semibold text-white">
                {insight.metricValue}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-100">
                {insight.title}
              </h3>
              <p className="mt-1 text-sm text-slate-200/90">
                {insight.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
