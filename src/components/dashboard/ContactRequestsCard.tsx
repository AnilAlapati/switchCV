"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

import Link from "next/link";

interface ContactMetrics {
  contactRequests: number;
}

export function ContactRequestsCard() {
  const { user } = useAuth();
  const metricsContext = useOptionalDashboardMetricsContext();
  const usingContext = Boolean(metricsContext);
  const contextMetrics = metricsContext?.jobSeekerMetrics;
  const contextLoading = metricsContext?.loading ?? false;
  const [metrics, setMetrics] = useState<ContactMetrics>({
    contactRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (usingContext) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const response = await fetch(
          `/api/jobseeker/metrics?userId=${user?.uid}`
        );
        if (response.ok) {
          const data = await response.json();
          setMetrics({ contactRequests: data.contactRequests || 0 });
        }
      } catch (error) {
        console.error("Failed to fetch contact requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user, usingContext]);
  const displayValue = usingContext
    ? contextMetrics?.contactRequests ?? 0
    : metrics.contactRequests;
  const loadingState = usingContext ? contextLoading : loading;

  return (
    <Link href="/dashboard/access-requests">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40 cursor-pointer">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-cyan-300">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-400 truncate">
                Contact Requests
              </dt>
              <dd className="text-2xl font-bold text-white">
                {loadingState ? "-" : displayValue}
              </dd>
            </dl>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-slate-300">
            {loadingState
              ? "Loading..."
              : displayValue === 0
              ? "No requests yet"
              : `${displayValue} contact request${
                  displayValue !== 1 ? "s" : ""
                }`}
          </p>
        </div>
      </div>
    </Link>
  );
}
