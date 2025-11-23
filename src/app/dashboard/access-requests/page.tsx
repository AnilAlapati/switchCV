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
}

export default function AccessRequestsPage() {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/jobseeker/access-requests?userId=${user?.uid}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId: string, resumeId: string, action: "approve" | "deny") => {
    try {
      await fetch("/api/profiles/respond-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, resumeId, action }),
      });
      fetchRequests(); // Refresh list
    } catch (error) {
      console.error("Failed to respond", error);
    }
  };

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user?.email} onLogout={logout} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white mb-8">Access Requests</h1>
        
        {loading ? (
          <div className="text-center text-slate-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-center text-slate-400 bg-slate-900/50 p-8 rounded-xl border border-slate-800">
            No pending access requests.
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-slate-900/80 border border-slate-700 rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {request.fromUserName} requested access to <span className="text-cyan-400">{request.resumeTitle}</span>
                  </h3>
                  <p className="text-slate-400 mt-1">"{request.message}"</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Requested on {new Date(request.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleResponse(request.id, request.resumeId, "deny")}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => handleResponse(request.id, request.resumeId, "approve")}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors font-medium"
                  >
                    Approve Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}
