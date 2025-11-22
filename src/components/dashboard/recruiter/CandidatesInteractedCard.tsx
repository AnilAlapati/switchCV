"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface InteractionMetrics {
  totalCandidatesInteracted: number;
}

export function CandidatesInteractedCard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<InteractionMetrics>({
    totalCandidatesInteracted: 0,
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
        `/api/recruiter/metrics?userId=${user?.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics({
          totalCandidatesInteracted: data.totalCandidatesInteracted || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch interaction metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl rounded-3xl border border-white/20 bg-white/10 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-white">
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
                d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20v-2a3 3 0 015.856-1.487M5 10a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Candidates Contacted
            </dt>
            <dd className="text-2xl font-bold text-white">
              {loading ? "-" : metrics.totalCandidatesInteracted}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-300">
          {loading
            ? "Loading..."
            : metrics.totalCandidatesInteracted === 0
            ? "No candidates contacted yet"
            : `${metrics.totalCandidatesInteracted} candidate${
                metrics.totalCandidatesInteracted !== 1 ? "s" : ""
              } contacted`}
        </p>
      </div>
    </div>
  );
}
