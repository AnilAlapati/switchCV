"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

interface AccessRequest {
  id: string;
  fromUserName: string;
  message: string;
  timestamp: string;
  resumeId: string;
  resumeTitle: string;
  status: "pending" | "approved" | "denied";
}

export default function AccessRequestsPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
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

  const handleResponse = async (
    requestId: string,
    resumeId: string,
    action: "approve" | "deny"
  ) => {
    try {
      const token = await user?.getIdToken();
      await fetch("/api/profiles/respond-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, resumeId, action }),
      });
      fetchRequests(); // Refresh list
    } catch (error) {
      console.error("Failed to respond", error);
    }
  };

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
            {displayedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {request.fromUserName} requested access to{" "}
                    <span className="text-cyan-400">{request.resumeTitle}</span>
                  </h3>
                  <p className="text-slate-400 mt-1">"{request.message}"</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {activeTab === "pending" ? "Requested on" : "Updated on"}{" "}
                    {new Date(request.timestamp).toLocaleDateString()}
                  </p>
                  {activeTab === "history" && (
                    <span
                      className={`mt-2 inline-block px-2 py-1 text-xs font-bold rounded uppercase ${
                        request.status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {request.status}
                    </span>
                  )}
                </div>
                {activeTab === "pending" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        handleResponse(request.id, request.resumeId, "deny")
                      }
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() =>
                        handleResponse(request.id, request.resumeId, "approve")
                      }
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors font-medium"
                    >
                      Approve Access
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}
