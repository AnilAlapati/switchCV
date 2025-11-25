import React from "react";
import type { RecruiterContactRequest } from "@/types/profileSearch";

interface RequestDetailsProps {
  selectedRequest: {
    id: string;
    request: RecruiterContactRequest;
  } | null;
  approveDuration: "1hour" | "1day" | "1week" | "30days";
  denialReason: string;
  processing: boolean;
  onApproveDurationChange: (
    duration: "1hour" | "1day" | "1week" | "30days"
  ) => void;
  onDenialReasonChange: (reason: string) => void;
  onApprove: () => void;
  onDeny: () => void;
}

export default function RequestDetails({
  selectedRequest,
  approveDuration,
  denialReason,
  processing,
  onApproveDurationChange,
  onDenialReasonChange,
  onApprove,
  onDeny,
}: RequestDetailsProps) {
  if (!selectedRequest) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-600">
        <p>Select a request from the list to review</p>
      </div>
    );
  }

  return (
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
            <span className="text-gray-600 block">Requested Fields:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedRequest.request.requestedFields.map((field) => (
                <span
                  key={field}
                  className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                >
                  {field}
                </span>
              ))}
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
              {new Date(selectedRequest.request.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <hr />

      {/* Decision */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Decision</h3>

        {/* Approve Section */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-900 mb-3">
            Approve for Duration:
          </label>
          <select
            value={approveDuration}
            onChange={(e) =>
              onApproveDurationChange(
                e.target.value as "1hour" | "1day" | "1week" | "30days"
              )
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
          >
            <option value="1hour">1 Hour</option>
            <option value="1day">1 Day</option>
            <option value="1week">1 Week (Recommended)</option>
            <option value="30days">30 Days</option>
          </select>
          <button
            onClick={onApprove}
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
            onChange={(e) => onDenialReasonChange(e.target.value)}
            placeholder="Explain why you're denying this request..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
            rows={3}
          />
          <button
            onClick={onDeny}
            disabled={processing || !denialReason.trim()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 font-medium"
          >
            {processing ? "Processing..." : "❌ Deny Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
