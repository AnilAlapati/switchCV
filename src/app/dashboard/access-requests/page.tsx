"use client";

import { logger } from "@/lib/logger";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AccessRequestCard } from "@/components/access/AccessRequestCard";
import { MAX_CUSTOM_DAYS } from "@/lib/accessDuration";
import type { DurationPreset } from "@/lib/accessDuration";
import type { DashboardAccessRequest, DurationFormState } from "./types";
import { buildDefaultDurationState, validateDuration } from "./durationHelpers";
import { useRouter } from "next/navigation";
import { useOptionalDashboardMetricsContext } from "@/context/DashboardMetricsContext";

export default function AccessRequestsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const metricsContext = useOptionalDashboardMetricsContext();
  const [requests, setRequests] = useState<DashboardAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [durationOverrides, setDurationOverrides] = useState<
    Record<string, DurationFormState>
  >({});
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.replace("/auth");
      router.refresh();
    } catch (error) {
      logger.error({ err: error }, "Failed to log out");
    }
  }, [logout, router]);

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/jobseeker/access-requests?userId=${user?.uid}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        setError("Failed to load requests. Please try again later.");
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch requests");
      setError("An error occurred while loading requests.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user, fetchRequests]);

  const updateDurationState = (
    requestId: string,
    updater: (prev: DurationFormState) => DurationFormState
  ) => {
    setDurationOverrides((prev) => {
      const current =
        prev[requestId] ||
        buildDefaultDurationState(
          requests.find((r) => r.id === requestId)?.requestedDuration
        );
      return {
        ...prev,
        [requestId]: updater(current),
      };
    });
  };

  const makePresetHandler = (requestId: string) => (preset: DurationPreset) => {
    updateDurationState(requestId, (prev) => ({
      ...prev,
      preset,
      error: null,
    }));
  };

  const makeCustomDaysHandler = (requestId: string) => (value: number) => {
    updateDurationState(requestId, (prev) => ({
      ...prev,
      customDays: value,
      error: null,
    }));
  };

  const handleDeny = async (request: DashboardAccessRequest) => {
    try {
      const token = await user?.getIdToken();
      await fetch("/api/profiles/respond-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: request.id,
          resumeId: request.resumeId,
          action: "deny",
        }),
      });
      fetchRequests(); // Refresh list
      // Refresh dashboard metrics if available
      if (metricsContext?.refreshJobSeekerMetrics) {
        await metricsContext.refreshJobSeekerMetrics();
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to respond");
    }
  };

  const handleApprove = async (request: DashboardAccessRequest) => {
    const formState =
      durationOverrides[request.id] ||
      buildDefaultDurationState(request.requestedDuration);
    const validation = validateDuration(request, formState);

    if (!validation.valid) {
      updateDurationState(request.id, (prev) => ({
        ...prev,
        error: validation.error || null,
      }));
      return;
    }

    const payloadDuration =
      formState.preset === "custom_days"
        ? { preset: "custom_days" as const, customDays: formState.customDays }
        : { preset: formState.preset };

    try {
      const token = await user?.getIdToken();
      await fetch("/api/profiles/respond-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId: request.id,
          resumeId: request.resumeId,
          action: "approve",
          grantDuration: payloadDuration,
          timezone,
        }),
      });
      fetchRequests();
      // Refresh dashboard metrics if available
      if (metricsContext?.refreshJobSeekerMetrics) {
        await metricsContext.refreshJobSeekerMetrics();
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to approve");
    }
  };

  useEffect(() => {
    setDurationOverrides((prev) => {
      const next = { ...prev };
      requests.forEach((request) => {
        if (!next[request.id]) {
          next[request.id] = buildDefaultDurationState(
            request.requestedDuration
          );
        }
      });
      return next;
    });
  }, [requests]);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const historyRequests = requests.filter((r) => r.status !== "pending");
  const displayedRequests =
    activeTab === "pending" ? pendingRequests : historyRequests;

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[#1A2F25] mb-8">Access Requests</h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-[#1A2F25]/10">
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "pending"
                ? "text-[#2C4A3B] border-b-2 border-[#2C4A3B]"
                : "text-[#1A2F25]/60 hover:text-[#1A2F25]"
              }`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "history"
                ? "text-[#2C4A3B] border-b-2 border-[#2C4A3B]"
                : "text-[#1A2F25]/60 hover:text-[#1A2F25]"
              }`}
          >
            History ({historyRequests.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center text-[#1A2F25]/60">Loading requests...</div>
        ) : error ? (
          <div className="text-center text-red-600 bg-red-50 p-8 rounded-xl border border-red-200">
            {error}
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="text-center text-[#1A2F25]/60 glass-panel p-8 rounded-xl">
            {activeTab === "pending"
              ? "No pending access requests."
              : "No request history available."}
          </div>
        ) : (
          <div className="grid gap-4">
            {displayedRequests.map((request) => {
              const durationState =
                durationOverrides[request.id] ||
                buildDefaultDurationState(request.requestedDuration);
              const maxHours =
                request.requestedDuration?.durationHours ??
                24 * MAX_CUSTOM_DAYS;

              return (
                <AccessRequestCard
                  key={request.id}
                  request={request}
                  activeTab={activeTab}
                  ownerTimezone={timezone}
                  loading={loading}
                  durationState={durationState}
                  durationError={durationOverrides[request.id]?.error}
                  maxHours={maxHours}
                  onDeny={() => handleDeny(request)}
                  onApprove={() => handleApprove(request)}
                  onPresetChange={makePresetHandler(request.id)}
                  onCustomDaysChange={makeCustomDaysHandler(request.id)}
                />
              );
            })}
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}
