"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RecruiterContactRequest } from "@/types/profileSearch";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PendingRequest {
  id: string;
  request: RecruiterContactRequest;
}

export default function RecruiterRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(
    null
  );
  const [denialReason, setDenialReason] = useState("");
  const [approveDuration, setApproveDuration] = useState<
    "1hour" | "1day" | "1week" | "30days"
  >("1week");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    try {
      setLoading(true);

      // Get all pending requests
      const q = query(
        collection(db, "recruiterRequests"),
        where("status", "==", "pending")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pending = snapshot.docs.map((doc) => ({
          id: doc.id,
          request: doc.data() as RecruiterContactRequest,
        }));

        // Sort by most recent first
        pending.sort(
          (a, b) =>
            new Date(b.request.createdAt).getTime() -
            new Date(a.request.createdAt).getTime()
        );

        setRequests(pending);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error loading requests:", error);
      setLoading(false);
    }
  };

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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Recruiter Request Management
          </h1>
          <p className="text-gray-600 mt-2">
            Review and approve/deny recruiter requests for candidate contact
            information
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Requests List */}
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
                  <button
                    key={item.id}
                    onClick={() => setSelectedRequest(item)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                      selectedRequest?.id === item.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {item.request.fromRecruiter.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {item.request.fromRecruiter.companyName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {item.request.requestedFields.length} field
                          {item.request.requestedFields.length !== 1 ? "s" : ""}{" "}
                          requested
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
                          ⏳ Pending
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2">
            {selectedRequest ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Recruiter Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Recruiter Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.request.fromRecruiter.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Company:</span>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.request.fromRecruiter.companyName}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.request.fromRecruiter.email}
                      </p>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Candidate Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Candidate Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.request.toUserEmail || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Resume:</span>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.request.resumeTitle || "Untitled"}
                      </p>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Request Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Request Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Purpose:</span>
                      <p className="font-medium text-gray-900 italic mt-1">
                        "{selectedRequest.request.purpose}"
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 block">
                        Requested Fields:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedRequest.request.requestedFields.map(
                          (field) => (
                            <span
                              key={field}
                              className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                            >
                              {field}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Proposed Duration:</span>
                      <p className="font-medium text-gray-900">
                        {selectedRequest.request.proposedDuration}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Submitted:</span>
                      <p className="font-medium text-gray-900">
                        {new Date(
                          selectedRequest.request.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Decision */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Decision
                  </h3>

                  {/* Approve Section */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Approve for Duration:
                    </label>
                    <select
                      value={approveDuration}
                      onChange={(e) =>
                        setApproveDuration(e.target.value as any)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
                    >
                      <option value="1hour">1 Hour</option>
                      <option value="1day">1 Day</option>
                      <option value="1week">1 Week (Recommended)</option>
                      <option value="30days">30 Days</option>
                    </select>
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                    >
                      {processing ? "Processing..." : "✅ Approve Request"}
                    </button>
                  </div>

                  {/* Deny Section */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      Deny with Reason:
                    </label>
                    <textarea
                      value={denialReason}
                      onChange={(e) => setDenialReason(e.target.value)}
                      placeholder="Explain why you're denying this request..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
                      rows={3}
                    />
                    <button
                      onClick={handleDeny}
                      disabled={processing || !denialReason.trim()}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
                    >
                      {processing ? "Processing..." : "❌ Deny Request"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-600">
                <p>Select a request from the list to review</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
