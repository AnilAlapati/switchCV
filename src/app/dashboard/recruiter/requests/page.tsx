/* eslint-disable max-lines */
"use client";

import { logger } from "@/lib/logger";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DeleteRequestDialog } from "@/components/dashboard/recruiter/DeleteRequestDialog";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { deriveTimeState } from "@/lib/recruiterRequests/timeUtils";
import { RequestCard } from "./RequestCard";
import type { DecoratedRequest, RecruiterRequest } from "./types";

type TabKey = "pending" | "active" | "history";

function RecruiterRequestsContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TabKey) || "pending";

  const [requests, setRequests] = useState<RecruiterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestToDelete, setRequestToDelete] =
    useState<RecruiterRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reRequestTarget, setReRequestTarget] =
    useState<RecruiterRequest | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Update activeTab when URL param changes
  useEffect(() => {
    const tab = searchParams.get("tab") as TabKey;
    if (tab && ["pending", "active", "history"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
    setError(null);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/recruiter/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      } else {
        setError("Failed to load requests.");
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const handleDeleteClick = (request: RecruiterRequest) => {
    setRequestToDelete(request);
  };

  const handleConfirmDelete = async () => {
    if (!requestToDelete) return;

    setIsDeleting(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(
        `/api/recruiter/requests?requestId=${requestToDelete.id}&resumeId=${requestToDelete.resumeId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setRequests((prev) =>
          prev.filter((req) => req.id !== requestToDelete.id)
        );
        setRequestToDelete(null);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete request");
      }
    } catch (error) {
      logger.error({ err: error }, "Error deleting request:");
      alert("Error deleting request");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReRequestClick = (request: RecruiterRequest) => {
    setReRequestTarget(request);
  };

  const closeReRequestDialog = () => {
    setReRequestTarget(null);
  };

  const handleReRequestSuccess = () => {
    closeReRequestDialog();
    fetchRequests();
  };

  const decoratedRequests = useMemo<DecoratedRequest[]>(() => {
    return [...requests]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .map((request) => ({
        ...request,
        timeState: deriveTimeState(
          {
            expiresAt: request.expiresAt,
            timeRemainingMs: request.timeRemainingMs,
          },
          now
        ),
      }));
  }, [requests, now]);

  const pendingRequests = decoratedRequests.filter(
    (request) => request.status === "pending"
  );
  const activeRequests = decoratedRequests.filter(
    (request) => request.status === "approved" && !request.timeState.expired
  );
  const historyRequests = decoratedRequests.filter((request) => {
    if (request.status === "denied") return true;
    return request.status === "approved" && request.timeState.expired;
  });

  const displayedRequests = useMemo(() => {
    switch (activeTab) {
      case "active":
        return activeRequests;
      case "history":
        return historyRequests;
      default:
        return pendingRequests;
    }
  }, [activeTab, pendingRequests, activeRequests, historyRequests]);

  // Filter tabs based on context
  // If we are in "active" mode (Available Resumes), we only show Active
  // If we are in "pending" mode (Pending Requests), we show Pending and History
  // If we are in "history" mode (Candidates Contacted), we show Pending and History but focus on History
  const isAvailableResumesView = activeTab === "active";
  const isContactHistoryView = activeTab === "history";

  const tabConfig: Array<{ key: TabKey; label: string; count: number }> =
    isAvailableResumesView
      ? [{ key: "active", label: "Active", count: activeRequests.length }]
      : [
        { key: "pending", label: "Pending", count: pendingRequests.length },
        { key: "history", label: "History", count: historyRequests.length },
      ];

  const emptyStateMessage = useMemo(() => {
    if (activeTab === "pending") {
      return "No pending access requests.";
    }
    if (activeTab === "active") {
      return "You have no active access grants.";
    }
    if (activeTab === "history") {
      return "No candidates contacted yet.";
    }
    return "No request history yet.";
  }, [activeTab]);

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-serif font-bold tracking-tight text-slate-900">
              {isAvailableResumesView
                ? "Available Resumes"
                : isContactHistoryView
                  ? "Candidates Contacted"
                  : "Access Requests"}
            </h1>
            <p className="text-slate-600 mt-2.5 text-base font-sans font-medium">
              {isAvailableResumesView
                ? "Manage approved resume access and view candidate profiles"
                : isContactHistoryView
                  ? "View all candidates you've contacted and their response status"
                  : "Track and manage your candidate access requests"}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-900 text-sm font-bold transition-all duration-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover:-translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-cyan-500/20 border-t-cyan-400 mb-5"></div>
            <p className="text-slate-400 text-base font-semibold">
              Loading requests...
            </p>
          </div>
        ) : error ? (
          <div className="text-center bg-red-950/30 border border-red-800/50 backdrop-blur-sm p-12 rounded-2xl shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-5">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-red-300 text-xl font-bold mb-2">
              Error Loading Requests
            </h3>
            <p className="text-red-400/80 text-sm">{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center bg-white border-2 border-black p-16 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 border-2 border-black mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <svg
                className="w-10 h-10 text-slate-900"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-slate-900 font-serif text-2xl font-bold mb-3">
              {isAvailableResumesView
                ? "No Available Resumes Yet"
                : isContactHistoryView
                  ? "No Candidates Contacted Yet"
                  : "No Access Requests Yet"}
            </h3>
            <p className="text-slate-600 text-base max-w-md mx-auto mb-8 font-medium">
              {isAvailableResumesView
                ? "Request access to candidate resumes to see them here."
                : isContactHistoryView
                  ? "Start discovering talent by searching for candidates and requesting access to their resumes."
                  : "Start discovering talent by searching for candidates and requesting access to their resumes."}
            </p>
            <Link
              href="/recruiter/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-slate-800 text-white rounded-lg font-bold transition-all duration-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <svg
                className="w-5 h-5"
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
              Search Candidates
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-2 p-1.5 rounded-lg bg-white border-2 border-slate-200 w-fit">
              {tabConfig.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    // Optional: Update URL to reflect tab change without full reload
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set("tab", tab.key);
                    window.history.pushState({}, "", newUrl);
                  }}
                  className={`relative py-2.5 px-6 rounded-md text-sm font-bold transition-all duration-200 border-2 ${activeTab === tab.key
                      ? "bg-slate-900 border-slate-900 text-white shadow-md"
                      : "bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                >
                  <span className="flex items-center justify-center gap-2.5">
                    {tab.label}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${activeTab === tab.key
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {tab.count}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {displayedRequests.length === 0 ? (
              <div className="text-center p-14 rounded-xl bg-white border-2 border-dashed border-slate-300">
                <div className="flex justify-center mb-5">
                  <div className="p-5 rounded-full bg-slate-50 border-2 border-slate-200">
                    <svg
                      className="w-12 h-12 text-slate-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-slate-900 text-lg font-serif font-bold">
                  {emptyStateMessage}
                </p>
                {activeTab === "active" && (
                  <p className="text-slate-500 text-sm mt-2 font-medium">
                    Request access to candidate resumes to see them here
                  </p>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {displayedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onDelete={handleDeleteClick}
                    onReRequest={handleReRequestClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <DeleteRequestDialog
          isOpen={!!requestToDelete}
          isDeleting={isDeleting}
          onClose={() => setRequestToDelete(null)}
          onConfirm={handleConfirmDelete}
          candidateName={requestToDelete?.candidateName || "Candidate"}
        />

        {reRequestTarget && (
          <RequestAccessDialog
            isOpen={!!reRequestTarget}
            profileId={reRequestTarget.resumeId}
            profileName={reRequestTarget.candidateName}
            onClose={closeReRequestDialog}
            onSuccess={handleReRequestSuccess}
          />
        )}
      </main>
    </DashboardBackground>
  );
}

export default function RecruiterRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-slate-400 p-8">Loading...</div>
      }
    >
      <RecruiterRequestsContent />
    </Suspense>
  );
}
