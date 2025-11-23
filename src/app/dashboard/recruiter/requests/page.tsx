"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import Link from "next/link";

interface RecruiterRequest {
  id: string;
  candidateName: string;
  resumeTitle: string;
  resumeId: string;
  message: string;
  timestamp: string;
  status: "pending" | "approved" | "denied";
}

export default function RecruiterRequestsPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<RecruiterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

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

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user?.email} onLogout={logout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">My Access Requests</h1>
          <Link
            href="/dashboard/recruiter"
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
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
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
                  <p className="text-slate-400 mt-1 text-sm italic">
                    "{request.message}"
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Sent on {new Date(request.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded uppercase ${
                      request.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : request.status === "denied"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {request.status}
                  </span>

                  {request.status === "approved" && (
                    <Link
                      href={`/resumes/${request.resumeId}`}
                      className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors font-medium text-sm"
                    >
                      View Resume
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}
