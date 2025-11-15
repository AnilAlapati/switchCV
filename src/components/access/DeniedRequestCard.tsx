import React from "react";
import type { AccessRequest } from "@/types/profileSearch";
import { formatDate } from "@/lib/formatDate";

export default function DeniedRequestCard({
  request,
}: {
  request: AccessRequest;
}) {
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
