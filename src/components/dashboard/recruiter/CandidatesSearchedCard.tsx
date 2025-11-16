"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface SearchMetrics {
  totalSearches: number;
}

export function CandidatesSearchedCard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SearchMetrics>({ totalSearches: 0 });
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
        `/api/recruiter/metrics?userId=${user?.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics({ totalSearches: data.totalSearches || 0 });
      }
    } catch (error) {
      console.error("Failed to fetch search metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/50 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Candidates Searched
            </dt>
            <dd className="text-2xl font-bold text-white">
              {loading ? "-" : metrics.totalSearches}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-slate-400 text-sm">
          {loading
            ? "Loading..."
            : metrics.totalSearches === 0
            ? "Start searching for candidates"
            : `${metrics.totalSearches} search${
                metrics.totalSearches !== 1 ? "es" : ""
              } performed`}
        </p>
      </div>
    </div>
  );
}
