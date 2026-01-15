"use client";

import type { ReactElement } from "react";
import type { OpportunityInsight } from "@/types/dashboard";

interface OpportunityInsightsCardProps {
  title: string;
  subtitle?: string;
  insights: OpportunityInsight[];
}

const toneStyles: Record<OpportunityInsight["tone"], string> = {
  positive: "bg-white border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
  info: "bg-gray-50 border-gray-300 hover:border-black",
  caution: "bg-white border-gray-200 hover:border-black",
};

const iconStyles: Record<OpportunityInsight["tone"], string> = {
  positive: "text-blue-600",
  info: "text-gray-600",
  caution: "text-gray-500",
};

export function OpportunityInsightsCard({
  title,
  subtitle,
  insights,
}: OpportunityInsightsCardProps): ReactElement {
  return (
    <section className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <header className="mb-6 flex items-start justify-between border-b-2 border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-black">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1 font-sans">{subtitle}</p>}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className={`group relative flex flex-col gap-4 p-5 border-2 transition-all ${toneStyles[insight.tone]}`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${iconStyles[insight.tone]}`}>
                {insight.metricLabel}
              </span>
            </div>

            <div>
              <p className="text-3xl font-serif font-bold text-black mb-4">
                {insight.metricValue}
              </p>

              <h3 className="text-base font-bold text-black mb-2">
                {insight.title}
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed font-sans">
                {insight.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
