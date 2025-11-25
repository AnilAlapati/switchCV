"use client";

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
      console.error("Failed to log out", error);
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
      console.error("Failed to fetch requests", error);
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
      console.error("Error deleting request:", error);
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
  const isAvailableResumesView = activeTab === "active";

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
    return "No request history yet.";
  }, [activeTab]);

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">
            {isAvailableResumesView ? "Available Resumes" : "Access Requests"}
          </h1>
          <Link
            href="/dashboard"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-slate-400">Loading requests...</div>
        ) : error ? (
          <div className="text-center text-red-400 bg-red-900/20 p-8 rounded-xl border border-red-800">
            {error}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center text-slate-400 bg-slate-900/50 p-8 rounded-xl border border-slate-800">
            You haven't sent any access requests yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex space-x-4 border-b border-slate-800">
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
                  className={`pb-2 px-4 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {`${tab.label} (${tab.count})`}
                </button>
              ))}
            </div>

            {displayedRequests.length === 0 ? (
              <div className="text-center text-slate-400 bg-slate-900/50 p-8 rounded-xl border border-slate-800">
                {emptyStateMessage}
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
