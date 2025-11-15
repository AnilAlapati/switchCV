// src/app/dashboard/access/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAccessRequests } from "@/hooks/useAccessRequests";
import { useRouter } from "next/navigation";
import { AccessRequest, AccessGrant } from "@/types/profileSearch";
import { db } from "@/lib/firebase";
import AccessRequestCard from "@/components/access/AccessRequestCard";
import ActiveGrantCard from "@/components/access/ActiveGrantCard";
import DeniedRequestCard from "@/components/access/DeniedRequestCard";

type TabType = "pending" | "active" | "denied";

export default function AccessDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const { pendingRequests, activeGrants, deniedRequests, loading } =
    useAccessRequests();

  // Hook handles real-time subscriptions and state

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
