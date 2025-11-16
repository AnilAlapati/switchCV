"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface LastUpdatedMetrics {
  lastUpdated: string | null;
}

interface LastUpdatedCardProps {
  hasResume?: boolean;
}

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return "Never";

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

export function LastUpdatedCard({ hasResume }: LastUpdatedCardProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<LastUpdatedMetrics>({
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchMetrics();
  }, [user]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/jobseeker/metrics?userId=${user?.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics({ lastUpdated: data.lastUpdated || null });
      }
    } catch (error) {
      console.error("Failed to fetch last updated:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/50 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Last Updated
            </dt>
            <dd className="text-lg font-bold text-white">
              {loading ? "-" : formatTimeAgo(metrics.lastUpdated)}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-slate-400 text-sm">
          {loading
            ? "Loading..."
            : metrics.lastUpdated
            ? "Keep your resume fresh!"
            : "Create your resume to track updates"}
        </p>
      </div>
    </div>
  );
}
