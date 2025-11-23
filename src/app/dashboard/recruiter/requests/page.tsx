"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DeleteRequestDialog } from "@/components/dashboard/recruiter/DeleteRequestDialog";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import {
  deriveTimeState,
  formatDateTime,
} from "@/lib/recruiterRequests/timeUtils";
import Link from "next/link";

interface RecruiterRequest {
  id: string;
  candidateName: string;
  resumeTitle: string;
  resumeId: string;
  message: string;
  timestamp: string;
  status: "pending" | "approved" | "denied";
  approvedAt?: string | null;
  expiresAt?: string | null;
  grantedDuration?: {
    label?: string;
    durationMs?: number;
  } | null;
  isExpired?: boolean;
  timeRemainingMs?: number | null;
}

export default function RecruiterRequestsPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<RecruiterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestToDelete, setRequestToDelete] =
    useState<RecruiterRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [reRequestTarget, setReRequestTarget] =
    useState<RecruiterRequest | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
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
  };

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

  const sortedRequests = useMemo(() => {
    return [...requests].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [requests]);

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user?.email} onLogout={logout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Access Requests</h1>
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
          <div className="grid gap-4">
            {sortedRequests.map((request) => {
              const timeState = deriveTimeState(
                {
                  expiresAt: request.expiresAt,
                  timeRemainingMs: request.timeRemainingMs,
                },
                now
              );
              const isApproved = request.status === "approved";
              const accessExpired = isApproved && timeState.expired;
              const hasActiveAccess = isApproved && !accessExpired;

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-950/60 p-6 shadow-xl shadow-slate-950/40"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Request to{" "}
                        <span className="text-cyan-400">
                          {request.candidateName}
                        </span>
                      </h3>
                      <p className="text-sm text-slate-300">
                        Resume: {request.resumeTitle}
                      </p>
                      {request.message && (
                        <p className="text-slate-400 mt-1 text-sm italic">
                          "{request.message}"
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        Sent on {formatDateTime(request.timestamp)}
                      </p>

                      {isApproved && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                          {accessExpired ? (
                            <p className="font-medium text-red-300">
                              Access expired. Request access again to view this
                              resume.
                            </p>
                          ) : (
                            <p className="font-medium text-cyan-200">
                              Time left: {timeState.label}
                            </p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {accessExpired
                              ? "The previous approval period ended."
                              : `Expires ${formatDateTime(request.expiresAt)}`}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded uppercase tracking-wide ${
                          request.status === "approved"
                            ? "bg-green-500/20 text-green-300"
                            : request.status === "denied"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-yellow-500/20 text-yellow-300"
                        }`}
                      >
                        {request.status}
                      </span>

                      {hasActiveAccess && (
                        <Link
                          href={`/resumes/${request.resumeId}`}
                          className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 rounded-lg transition-colors font-medium text-sm"
                        >
                          View Resume
                        </Link>
                      )}

                      {accessExpired && (
                        <button
                          onClick={() => handleReRequestClick(request)}
                          className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 rounded-lg transition-colors font-medium text-sm"
                        >
                          Request Again
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteClick(request)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                        title="Delete Request"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
