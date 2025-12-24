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
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60 flex items-center">
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          Engagement Distribution
        </h3>
        <span className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">
          Traffic Acquisition
        </span>
      </div>

      <div className="space-y-6">
        {Object.entries(engagement.viewsBySource).map(([source, count]) => {
          const total = Object.values(engagement.viewsBySource).reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={source} className="group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[#1A2F25] capitalize">{source}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#1A2F25]">{count}</span>
                  <span className="text-[10px] font-bold text-[#1A2F25]/40">{percentage.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A2F25] transition-all duration-1000 ease-out group-hover:bg-blue-600"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
