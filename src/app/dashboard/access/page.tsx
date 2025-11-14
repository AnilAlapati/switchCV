// src/app/dashboard/access/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useRouter } from "next/navigation";
import { AccessRequest, AccessGrant } from "@/types/profileSearch";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

type TabType = "pending" | "active" | "denied";

export default function AccessDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [activeGrants, setActiveGrants] = useState<AccessGrant[]>([]);
  const [deniedRequests, setDeniedRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for requests
  useEffect(() => {
    if (!user || authLoading) return;

    try {
      const requestsRef = collection(db, "resumes", user.uid, "accessRequests");
      const q = query(requestsRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              requestId: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate(),
            } as AccessRequest)
        );

        setPendingRequests(docs.filter((r) => r.status === "pending"));
        setDeniedRequests(docs.filter((r) => r.status === "denied"));
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up requests listener:", err);
      setLoading(false);
    }
  }, [user, authLoading]);

  // Real-time listener for grants
  useEffect(() => {
    if (!user || authLoading) return;

    try {
      const grantsRef = collection(db, "resumes", user.uid, "accessGrants");
      const q = query(grantsRef, orderBy("grantedAt", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              grantId: doc.id,
              ...doc.data(),
              grantedAt: doc.data().grantedAt?.toDate(),
              expiresAt: doc.data().expiresAt?.toDate(),
            } as AccessGrant)
        );

        // Filter out expired grants
        const now = new Date();
        const active = docs.filter((g) => !g.expiresAt || g.expiresAt > now);
        setActiveGrants(active);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up grants listener:", err);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-spin"></div>
              <div className="absolute inset-2 bg-gray-800 rounded-full"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-400">Loading access requests...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Access Control Hub
          </h1>
          <p className="text-gray-400">
            Manage who can view your resume and approval status
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-900/30 to-blue-900/10 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Requests</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">
                  {pendingRequests.length}
                </p>
              </div>
              <div className="text-4xl">📥</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/30 to-green-900/10 border border-green-500/20 rounded-xl p-6 backdrop-blur-sm hover:border-green-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Grants</p>
                <p className="text-3xl font-bold text-green-400 mt-2">
                  {activeGrants.length}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-900/30 to-red-900/10 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm hover:border-red-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Denied Requests</p>
                <p className="text-3xl font-bold text-red-400 mt-2">
                  {deniedRequests.length}
                </p>
              </div>
              <div className="text-4xl">❌</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700">
          {(["pending", "active", "denied"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition-all relative ${
                activeTab === tab
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab === "pending" && "Pending"}
              {tab === "active" && "Active"}
              {tab === "denied" && "Denied"}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === "pending" &&
            (pendingRequests.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-xl backdrop-blur-sm">
                <p className="text-gray-500 text-lg">No pending requests</p>
              </div>
            ) : (
              pendingRequests.map((request) => (
                <AccessRequestCard
                  key={request.requestId}
                  request={request}
                  onAction={() => setActiveTab("active")}
                />
              ))
            ))}

          {activeTab === "active" &&
            (activeGrants.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-xl backdrop-blur-sm">
                <p className="text-gray-500 text-lg">No active grants</p>
              </div>
            ) : (
              activeGrants.map((grant) => (
                <ActiveGrantCard key={grant.grantId} grant={grant} />
              ))
            ))}

          {activeTab === "denied" &&
            (deniedRequests.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-xl backdrop-blur-sm">
                <p className="text-gray-500 text-lg">No denied requests</p>
              </div>
            ) : (
              deniedRequests.map((request) => (
                <DeniedRequestCard key={request.requestId} request={request} />
              ))
            ))}
        </div>
      </div>
    </div>
  );
}

function AccessRequestCard({
  request,
  onAction,
}: {
  request: AccessRequest;
  onAction: () => void;
}) {
  const [duration, setDuration] = useState<
    "1hour" | "1day" | "1week" | "forever"
  >("1week");
  const [approving, setApproving] = useState(false);
  const [denying, setDenying] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const response = await fetch("/api/profiles/approve-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.requestId,
          duration,
        }),
      });

      if (response.ok) {
        onAction();
      }
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setApproving(false);
    }
  };

  const handleDeny = async () => {
    setDenying(true);
    try {
      await fetch("/api/profiles/deny-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.requestId,
        }),
      });
    } catch (err) {
      console.error("Error denying request:", err);
    } finally {
      setDenying(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-blue-900/5 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm hover:border-blue-500/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {request.fromUserName}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {request.message || "Requested access to your resume"}
          </p>
        </div>
        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
          {formatDate(request.timestamp)}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            How long should they have access?
          </label>
          <select
            value={duration}
            onChange={(e) =>
              setDuration(
                e.target.value as "1hour" | "1day" | "1week" | "forever"
              )
            }
            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1hour">1 Hour</option>
            <option value="1day">1 Day</option>
            <option value="1week">1 Week</option>
            <option value="forever">Forever</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approving ? "Approving..." : "✓ Approve"}
          </button>
          <button
            onClick={handleDeny}
            disabled={denying}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {denying ? "Denying..." : "✕ Deny"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActiveGrantCard({ grant }: { grant: AccessGrant }) {
  const [revoking, setRevoking] = useState(false);
  const timeRemaining = grant.expiresAt
    ? Math.ceil(
        (grant.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await fetch("/api/profiles/revoke-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: grant.grantId,
        }),
      });
    } catch (err) {
      console.error("Error revoking access:", err);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm hover:border-green-500/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ✓ Access Granted
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
              {grant.duration}
            </span>
          </h3>
          {timeRemaining !== null && (
            <p className="text-sm text-gray-400 mt-1">
              {timeRemaining <= 0
                ? "Expires today"
                : `${timeRemaining} day${
                    timeRemaining !== 1 ? "s" : ""
                  } remaining`}
            </p>
          )}
          {timeRemaining === null && (
            <p className="text-sm text-gray-400 mt-1">Forever</p>
          )}
        </div>
        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
          {formatDate(grant.grantedAt)}
        </span>
      </div>

      <button
        onClick={handleRevoke}
        disabled={revoking}
        className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {revoking ? "Revoking..." : "🔒 Revoke Access"}
      </button>
    </div>
  );
}

function DeniedRequestCard({ request }: { request: AccessRequest }) {
  return (
    <div className="bg-gradient-to-br from-red-900/20 to-red-900/5 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ✕ {request.fromUserName}
            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded-full">
              Denied
            </span>
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            You denied their access request
          </p>
        </div>
        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded-full">
          {formatDate(request.timestamp)}
        </span>
      </div>
    </div>
  );
}

function formatDate(date: Date | undefined | null): string {
  if (!date) return "Unknown date";

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
