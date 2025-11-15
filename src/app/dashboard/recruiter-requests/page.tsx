"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRecruiterRequests } from "@/hooks/useRecruiterRequests";
import RequestItem from "@/components/recruiter/RequestItem";
import RequestDetails from "@/components/recruiter/RequestDetails";

interface PendingRequest {
  id: string;
  request: any;
}

export default function RecruiterRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const { requests, loading } = useRecruiterRequests();
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(
    null
  );
  const [denialReason, setDenialReason] = useState("");
  const [approveDuration, setApproveDuration] = useState<
    "1hour" | "1day" | "1week" | "30days"
  >("1week");
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);

      const response = await fetch("/api/recruiters/approve-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          duration: approveDuration,
          adminUserId: user?.uid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Approval failed");
      }

      alert("✅ Request approved!");
      setSelectedRequest(null);
    } catch (error) {
      alert(`❌ ${error instanceof Error ? error.message : "Approval failed"}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!selectedRequest || !denialReason.trim()) {
      alert("Please provide a reason for denial");
      return;
    }

    try {
      setProcessing(true);

      const response = await fetch("/api/recruiters/deny-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          reason: denialReason,
          adminUserId: user?.uid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Denial failed");
      }

      alert("✅ Request denied!");
      setSelectedRequest(null);
      setDenialReason("");
    } catch (error) {
      alert(`❌ ${error instanceof Error ? error.message : "Denial failed"}`);
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access this page
          </p>
          <a
            href="/auth"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Recruiter Request Management
          </h1>
          <p className="text-gray-600 mt-2">
            Review and approve/deny recruiter requests for candidate contact information
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Pending Requests
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {requests.length} request{requests.length !== 1 ? "s" : ""}{" "}
                  waiting for review
                </p>
              </div>

              {loading && (
                <div className="p-6 text-center text-gray-600">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2">Loading...</p>
                </div>
              )}

              {!loading && requests.length === 0 && (
                <div className="p-6 text-center text-gray-600">
                  <p>✅ All requests reviewed!</p>
                </div>
              )}

              <div className="divide-y max-h-screen overflow-y-auto">
                {requests.map((item) => (
                  <RequestItem
                    key={item.id}
                    item={item}
                    selected={selectedRequest?.id === item.id}
                    onClick={() => setSelectedRequest(item)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <RequestDetails
              selectedRequest={selectedRequest}
              approveDuration={approveDuration}
              denialReason={denialReason}
              processing={processing}
              onApproveDurationChange={setApproveDuration}
              onDenialReasonChange={setDenialReason}
              onApprove={handleApprove}
              onDeny={handleDeny}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
