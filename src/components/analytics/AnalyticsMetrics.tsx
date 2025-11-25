"use client";

import type { Analytics } from "@/types";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  borderColor: string;
  subtext?: string;
}

function MetricCard({
  label,
  value,
  icon,
  borderColor,
  subtext,
}: MetricCardProps) {
  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-700 p-4 hover:${borderColor} transition-colors`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-sm">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subtext && <p className="text-gray-500 text-xs">{subtext}</p>}
    </div>
  );
}

interface AnalyticsMetricsProps {
  analytics: Analytics;
}

export function AnalyticsMetrics({ analytics }: AnalyticsMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <MetricCard
        label="Total Views"
        value={analytics.views.count.toLocaleString()}
        icon="👁️"
        borderColor="border-blue-500"
        subtext={`${analytics.views.uniqueViewers} unique viewers`}
      />
      <MetricCard
        label="Unique Visitors"
        value={analytics.views.uniqueViewers.toLocaleString()}
        icon="👥"
        borderColor="border-green-500"
        subtext="Individual viewers"
      />
      <MetricCard
        label="Avg Session"
        value={`${analytics.views.avgSessionDuration.toFixed(0)}s`}
        icon="⏱️"
        borderColor="border-purple-500"
        subtext="average time spent"
      />
      <MetricCard
        label="Total Interactions"
        value={analytics.totalInteractions.toLocaleString()}
        icon="⚡"
        borderColor="border-orange-500"
        subtext="views + requests + approvals"
      />
    </div>
  );
}
