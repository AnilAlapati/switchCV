"use client";

import type { RequestStatistics } from "@/types";

interface RequestStatsCardProps {
  label: string;
  value: number;
  color: string;
}

function RequestStatsCard({ label, value, color }: RequestStatsCardProps) {
  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

interface RequestStatisticsProps {
  requests: RequestStatistics;
}

export function RequestStatistics({ requests }: RequestStatisticsProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">📋</span>
        Access Requests
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RequestStatsCard
          label="Total Requests"
          value={requests.totalRequests}
          color="text-white"
        />
        <RequestStatsCard
          label="Approved"
          value={requests.approvedRequests}
          color="text-green-400"
        />
        <RequestStatsCard
          label="Pending"
          value={requests.pendingRequests}
          color="text-yellow-400"
        />
        <RequestStatsCard
          label="Denied"
          value={requests.deniedRequests}
          color="text-red-400"
        />
      </div>
    </div>
  );
}
