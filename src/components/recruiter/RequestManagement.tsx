"use client";

import { useState, useEffect } from "react";
import { RecruiterContactRequest } from "@/types/profileSearch";

interface RequestManagementProps {
  recruiterId: string;
  onRequestSelect?: (request: RecruiterContactRequest) => void;
}

type RequestStatus = "pending" | "approved" | "denied" | "expired";

export function RequestManagement({
  recruiterId,
  onRequestSelect,
}: RequestManagementProps) {
  const [requests, setRequests] = useState<RecruiterContactRequest[]>([]);
  const [activeTab, setActiveTab] = useState<RequestStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    denied: 0,
    expired: 0,
  });

  useEffect(() => {
    loadRequests();
  }, [recruiterId]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/recruiters/request-contact?recruiterId=${recruiterId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load requests");
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setStats(data.summary || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((r) => r.status === activeTab);

  const statusConfig = {
    pending: {
      badge: "bg-yellow-100 text-yellow-800",
      icon: "⏳",
      title: "Pending Approval",
      description: "Awaiting admin review",
    },
    approved: {
      badge: "bg-green-100 text-green-800",
      icon: "✅",
      title: "Approved",
      description: "Access granted",
    },
    denied: {
      badge: "bg-red-100 text-red-800",
      icon: "❌",
      title: "Denied",
      description: "Request was denied",
    },
    expired: {
      badge: "bg-gray-100 text-gray-800",
      icon: "⏰",
      title: "Expired",
      description: "Access has expired",
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Requests</div>
        </div>
        <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
          <div className="text-2xl font-bold text-yellow-800">
            {stats.pending}
          </div>
          <div className="text-sm text-yellow-700">Pending</div>
        </div>
        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
          <div className="text-2xl font-bold text-green-800">
            {stats.approved}
          </div>
          <div className="text-sm text-green-700">Approved</div>
        </div>
        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <div className="text-2xl font-bold text-red-800">{stats.denied}</div>
          <div className="text-sm text-red-700">Denied</div>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-800">
            {stats.expired}
          </div>
          <div className="text-sm text-gray-600">Expired</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-4">
        {(["pending", "approved", "denied", "expired"] as RequestStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === status
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {statusConfig[status].title}
              {stats[status] > 0 && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${statusConfig[status].badge}`}
                >
                  {stats[status]}
                </span>
              )}
            </button>
          )
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-600">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">Loading requests...</p>
        </div>
      )}

      {/* Requests List */}
      {!loading && filteredRequests.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <div className="text-3xl mb-2">📭</div>
          <p>No {statusConfig[activeTab].title.toLowerCase()} requests</p>
        </div>
      )}

      {!loading && filteredRequests.length > 0 && (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              status={activeTab}
              onSelect={() => onRequestSelect?.(request)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RequestCardProps {
  request: RecruiterContactRequest;
  status: RequestStatus;
  onSelect: () => void;
}

function RequestCard({ request, status, onSelect }: RequestCardProps) {
  const statusConfig = {
    pending: { badge: "bg-yellow-100 text-yellow-800", icon: "⏳" },
    approved: { badge: "bg-green-100 text-green-800", icon: "✅" },
    denied: { badge: "bg-red-100 text-red-800", icon: "❌" },
    expired: { badge: "bg-gray-100 text-gray-800", icon: "⏰" },
  };

  const config = statusConfig[status];
  const createdDate = new Date(request.createdAt);
  const daysAgo = Math.floor(
    (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">
              {request.toUserEmail || "Unknown Candidate"}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${config.badge}`}
            >
              {config.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Resume: {request.resumeTitle || "Untitled"}
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
        </div>
      </div>

      {request.purpose && (
        <p className="text-sm text-gray-700 mb-3 italic">"{request.purpose}"</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          Duration: {request.proposedDuration}
        </span>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          Fields: {request.requestedFields.join(", ")}
        </span>
      </div>

      {request.denialReason && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Reason:</strong> {request.denialReason}
        </div>
      )}

      {request.accessExpiresAt && status === "approved" && (
        <div className="mb-3 text-sm text-gray-700">
          <strong>Access expires:</strong>{" "}
          {new Date(request.accessExpiresAt).toLocaleDateString()}
        </div>
      )}

      <button
        onClick={onSelect}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        View Details
      </button>
    </div>
  );
}
