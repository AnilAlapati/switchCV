import React, { useState } from "react";
import type { AccessGrant } from "@/types/profileSearch";
import { formatDate } from "@/lib/formatDate";

export default function ActiveGrantCard({ grant }: { grant: AccessGrant }) {
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
        body: JSON.stringify({ grantId: grant.grantId }),
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
