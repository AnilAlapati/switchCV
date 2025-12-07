"use client";

import type { OpportunityInsight } from "@/types/dashboard";

interface OpportunityInsightsCardProps {
  title: string;
  subtitle?: string;
  insights: OpportunityInsight[];
}

const toneAccent: Record<OpportunityInsight["tone"], string> = {
  positive: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  info: "bg-cyan-50 text-cyan-700 border border-cyan-100",
  caution: "bg-amber-50 text-amber-700 border border-amber-100",
};

export function OpportunityInsightsCard({
  title,
  subtitle,
  insights,
}: OpportunityInsightsCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-5 space-y-1">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`flex flex-col gap-4 rounded-xl p-4 transition hover:shadow-md ${toneAccent[insight.tone]
              }`}
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-current opacity-70">
                {insight.metricLabel}
              </span>
              <p className="text-2xl font-bold text-slate-900">
                {insight.metricValue}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-slate-900">
                {insight.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {insight.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
