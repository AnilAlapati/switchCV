import React, { useState } from "react";
import type { AccessRequest } from "@/types/profileSearch";

export default function AccessRequestCard({
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
        body: JSON.stringify({ requestId: request.requestId }),
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
          {request.timestamp?.toLocaleString()}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            How long should they have access?
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value as any)}
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
