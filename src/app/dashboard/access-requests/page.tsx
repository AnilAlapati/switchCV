"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AccessRequestCard } from "@/components/access/AccessRequestCard";
import { MAX_CUSTOM_DAYS } from "@/lib/accessDuration";
import type { DurationPreset } from "@/lib/accessDuration";
import type { DashboardAccessRequest, DurationFormState } from "./types";
import { buildDefaultDurationState, validateDuration } from "./durationHelpers";

export default function AccessRequestsPage() {
  const { user, logout } = useAuth();
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

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
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
      console.error("Failed to fetch requests", error);
      setError("An error occurred while loading requests.");
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error("Failed to respond", error);
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
    } catch (error) {
      console.error("Failed to approve", error);
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
      <DashboardHeader userEmail={user?.email} onLogout={logout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Access Requests</h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab("pending")}
            className={`pb-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "pending"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            History ({historyRequests.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center text-slate-400">Loading requests...</div>
        ) : error ? (
          <div className="text-center text-red-400 bg-red-900/20 p-8 rounded-xl border border-red-800">
            {error}
          </div>
        ) : displayedRequests.length === 0 ? (
          <div className="text-center text-slate-400 bg-slate-900/50 p-8 rounded-xl border border-slate-800">
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
