"use client";

import type { Analytics } from "@/types";

interface TopReferrersProps {
  referrers: Record<string, number>;
}

export function TopReferrers({ referrers }: TopReferrersProps) {
  if (Object.keys(referrers).length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🔗</span>
        Top Referrers
      </h3>
      <div className="space-y-3">
        {Object.entries(referrers)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([referrer, count]) => (
            <div
              key={referrer}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center flex-1">
                <span className="text-blue-400 mr-3">→</span>
                <span className="text-gray-300 text-sm truncate">
                  {referrer || "Direct"}
                </span>
              </div>
              <span className="text-white font-semibold ml-4">
                {count} view{count !== 1 ? "s" : ""}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
