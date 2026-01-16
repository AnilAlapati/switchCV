"use client";

import type { RequestStatistics as RequestStatsType } from "@/types";

interface RequestStatsCardProps {
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'red' | 'slate';
}

function RequestStatsCard({ label, value, color }: RequestStatsCardProps) {
  const colorMap = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    red: 'text-red-600 bg-red-50 border-red-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} transition-all hover:shadow-sm`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

interface RequestStatisticsProps {
  requests: RequestStatsType;
}

export function RequestStatistics({ requests }: RequestStatisticsProps) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60 flex items-center">
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-orange-500"></span>
          Inquiry Funnel
        </h3>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">Active Requests</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RequestStatsCard
          label="Total"
          value={requests.totalRequests}
          color="slate"
        />
        <RequestStatsCard
          label="Approved"
          value={requests.approvedRequests}
          color="emerald"
        />
        <RequestStatsCard
          label="Pending"
          value={requests.pendingRequests}
          color="amber"
        />
        <RequestStatsCard
          label="Denied"
          value={requests.deniedRequests}
          color="red"
        />
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#1A2F25]/40">
          <span>Success Rate</span>
          <span className="text-emerald-600">
            {requests.totalRequests > 0
              ? ((requests.approvedRequests / requests.totalRequests) * 100).toFixed(0)
              : 0}%
          </span>
        </div>
        <div className="h-1 w-full bg-slate-50 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-1000"
            style={{ width: `${requests.totalRequests > 0 ? (requests.approvedRequests / requests.totalRequests) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
