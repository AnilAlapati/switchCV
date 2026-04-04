"use client";

import { AIDailyMetricsDoc, PersistedAIIncident } from "@/types/aiMonitoring";

interface OverviewSectionProps {
  overview:
    | {
        days: number;
        latestDailyMetrics: AIDailyMetricsDoc | null;
        openIncidentCount: number;
      }
    | undefined;
  openIncidents: Record<string, PersistedAIIncident> | undefined;
}

export function OverviewSection({
  overview,
  openIncidents,
}: OverviewSectionProps) {
  if (!overview) return null;

  const metrics = overview.latestDailyMetrics;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">System Overview</h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Open Incidents
          </h3>
          <div
            className={`text-3xl font-bold ${
              overview.openIncidentCount > 0
                ? "text-red-600"
                : "text-emerald-600"
            }`}
          >
            {overview.openIncidentCount}
          </div>
          {overview.openIncidentCount > 0 && (
            <div className="mt-2 text-sm text-red-500">
              Active alerts require attention
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Failure Rate (Today)
          </h3>
          <div className="text-3xl font-bold text-slate-900">
            {metrics
              ? metrics.totalRequests > 0
                ? `${((metrics.failedRequests / metrics.totalRequests) * 100).toFixed(1)}%`
                : "0%"
              : "N/A"}
          </div>
          <div className="mt-2 flex gap-2 text-sm text-slate-600">
            <span>{metrics?.failedRequests || 0} failed</span>
            <span>/</span>
            <span>{metrics?.totalRequests || 0} total</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            User-Visible Failures
          </h3>
          <div className="text-3xl font-bold text-slate-900">
            {metrics?.userVisibleFailures || 0}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Total failures not masked by fallback
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Fallback Recoveries
          </h3>
          <div className="text-3xl font-bold text-slate-900">
            {metrics?.fallbackRecoveredRequests || 0}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Requests saved by fallback extraction
          </div>
        </div>
      </div>

      {overview.openIncidentCount > 0 && openIncidents && (
        <div className="bg-red-50 p-6 rounded-xl border border-red-200">
          <h3 className="text-lg font-bold text-red-900 mb-4">
            Active Incidents
          </h3>
          <div className="space-y-4">
            {Object.values(openIncidents).map((incident) => (
              <div
                key={incident.key}
                className="bg-white p-4 rounded-lg border border-red-100"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-900">
                    {incident.title}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      incident.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {incident.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  {incident.summary}
                </p>
                <div className="text-xs text-slate-500 mt-2">
                  Started: {new Date(incident.startedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
