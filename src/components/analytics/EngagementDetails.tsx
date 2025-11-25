"use client";

import type { EngagementMetrics } from "@/types";

interface EngagementDetailsProps {
  engagement: EngagementMetrics;
}

export function EngagementDetails({ engagement }: EngagementDetailsProps) {
  if (!engagement.viewsBySource) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">📊</span>
        Engagement Details
      </h3>
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-sm mb-3">Views by Source</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(engagement.viewsBySource).map(([source, count]) => (
              <div
                key={source}
                className="bg-gray-700 rounded-lg p-3 text-center"
              >
                <p className="text-gray-400 text-xs capitalize mb-1">
                  {source}
                </p>
                <p className="text-xl font-bold text-white">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
