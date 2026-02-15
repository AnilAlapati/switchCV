"use client";

import { useState, useEffect, useCallback } from "react";
import { RecruiterContactRequest } from "@/types/profileSearch";
import { RequestStats } from "./RequestStats";
import { RequestTabs } from "./RequestTabs";
import { RequestCard } from "./RequestCard";

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

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/recruiters/request-contact?recruiterId=${recruiterId}`,
        { signal }
      );

      if (signal?.aborted) return;

      if (!response.ok) {
        throw new Error("Failed to load requests");
      }

      const data = await response.json();
      setRequests(data.requests || []);
      setStats(data.summary || {});
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [recruiterId]);

  useEffect(() => {
    const abortController = new AbortController();
    loadRequests(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [loadRequests]);

  const filteredRequests = requests.filter((r) => r.status === activeTab);

  return (
    <div className="space-y-6">
      <RequestStats
        total={stats.total}
        pending={stats.pending}
        approved={stats.approved}
        denied={stats.denied}
        expired={stats.expired}
      />

      <RequestTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={{
          pending: stats.pending,
          approved: stats.approved,
          denied: stats.denied,
          expired: stats.expired,
        }}
      />

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-600">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status"></div>
          <p className="mt-2">Loading requests...</p>
        </div>
      )}

      {/* Requests List */}
      {!loading && filteredRequests.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <div className="text-3xl mb-2">📭</div>
          <p>No {activeTab} requests</p>
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
