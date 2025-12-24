"use client";

import type { Analytics } from "@/types";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtext?: string;
}

function MetricCard({
  label,
  value,
  icon,
  color,
  subtext,
}: MetricCardProps) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-emerald-600 bg-emerald-50 border-emerald-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    orange: "text-orange-600 bg-orange-50 border-orange-100",
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm group hover:border-blue-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2F25]/60">{label}</h3>
        <span className={`h-10 w-10 flex items-center justify-center rounded-xl text-xl border ${colorMap[color]}`}>{icon}</span>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-[#1A2F25]">{value}</p>
        {subtext && <p className="text-[10px] font-bold text-[#1A2F25]/40 mt-1 uppercase tracking-widest">{subtext}</p>}
      </div>
    </div>
  );
}

interface AnalyticsMetricsProps {
  analytics: Analytics;
}

export function AnalyticsMetrics({ analytics }: AnalyticsMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        label="Total Views"
        value={analytics.views.count.toLocaleString()}
        icon="👁️"
        color="blue"
        subtext={`${analytics.views.uniqueViewers} unique viewers`}
      />
      <MetricCard
        label="Returning Hits"
        value={(analytics.views.count - analytics.views.uniqueViewers).toLocaleString()}
        icon="👥"
        color="green"
        subtext="Repeat interactions"
      />
      <MetricCard
        label="Avg Session"
        value={`${analytics.views.avgSessionDuration.toFixed(0)}s`}
        icon="⏱️"
        color="purple"
        subtext="time on profile"
      />
      <MetricCard
        label="Interactions"
        value={analytics.totalInteractions.toLocaleString()}
        icon="⚡"
        color="orange"
        subtext="Total engagement"
      />
    </div>
  );
}
