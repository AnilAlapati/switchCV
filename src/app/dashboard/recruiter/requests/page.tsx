"use client";

import { logger } from "@/lib/logger";
import { toast } from "sonner";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DeleteRequestDialog } from "@/components/dashboard/recruiter/DeleteRequestDialog";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { deriveTimeState } from "@/lib/recruiterRequests/timeUtils";
import { RequestCard } from "./RequestCard";
import type { DecoratedRequest, RecruiterRequest, TabKey } from "./types";

import {
  LoadingState,
  ErrorState,
  EmptyState,
  TabSwitcher,
  EmptyTabContent,
  PageHeader
} from "./RequestPageComponents";


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
        },
      );

      if (response.ok) {
        setRequests((prev) =>
          prev.filter((req) => req.id !== requestToDelete.id),
        );
        setRequestToDelete(null);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete request");
      }
    } catch (error) {
      logger.error({ err: error }, "Error deleting request:");
      toast.error("Error deleting request");
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
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .map((request) => ({
        ...request,
        timeState: deriveTimeState(
          {
            expiresAt: request.expiresAt,
            timeRemainingMs: request.timeRemainingMs,
          },
          now,
        ),
      }));
  }, [requests, now]);

  const pendingRequests = decoratedRequests.filter(
    (request) => request.status === "pending",
  );
  const activeRequests = decoratedRequests.filter(
    (request) => request.status === "approved" && !request.timeState.expired,
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

  const isAvailableResumesView = activeTab === "active";
  const isContactHistoryView = activeTab === "history";

  const tabConfig = useMemo(() =>
    isAvailableResumesView
      ? [{ key: "active" as TabKey, label: "Active", count: activeRequests.length }]
      : [
        { key: "pending" as TabKey, label: "Pending", count: pendingRequests.length },
        { key: "history" as TabKey, label: "History", count: historyRequests.length },
      ],
    [isAvailableResumesView, activeRequests.length, pendingRequests.length, historyRequests.length]
  );

  const emptyStateMessage = useMemo(() => {
    if (activeTab === "pending") return "No pending access requests.";
    if (activeTab === "active") return "You have no active access grants.";
    if (activeTab === "history") return "No candidates contacted yet.";
    return "No request history yet.";
  }, [activeTab]);

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user?.email} onLogout={handleLogout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          isAvailableResumesView={isAvailableResumesView}
          isContactHistoryView={isContactHistoryView}
        />


        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : requests.length === 0 ? (
          <EmptyState
            viewType={isAvailableResumesView ? "available" : isContactHistoryView ? "contact" : "requests"}
            title={isAvailableResumesView ? "No Available Resumes Yet" : isContactHistoryView ? "No Candidates Contacted Yet" : "No Access Requests Yet"}
            description={isAvailableResumesView
              ? "Request access to candidate resumes to see them here."
              : "Start discovering talent by searching for candidates and requesting access to their resumes."}
          />
        ) : (
          <div className="space-y-6">
            <TabSwitcher
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set("tab", tab);
                window.history.pushState({}, "", newUrl);
              }}
              tabConfig={tabConfig}
            />

            {displayedRequests.length === 0 ? (
              <EmptyTabContent
                message={emptyStateMessage}
                showAction={activeTab === "active"}
              />
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
