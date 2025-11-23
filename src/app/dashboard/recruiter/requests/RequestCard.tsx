import Link from "next/link";
import { formatDateTime } from "@/lib/recruiterRequests/timeUtils";
import type { DecoratedRequest } from "./types";

interface RequestCardProps {
  request: DecoratedRequest;
  onDelete: (request: DecoratedRequest) => void;
  onReRequest: (request: DecoratedRequest) => void;
}

export function RequestCard({
  request,
  onDelete,
  onReRequest,
}: RequestCardProps) {
  const { timeState } = request;
  const isApproved = request.status === "approved";
  const accessExpired = isApproved && timeState.expired;
  const hasActiveAccess = isApproved && !accessExpired;

  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-950/60 p-6 shadow-xl shadow-slate-950/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Request to{" "}
            <span className="text-cyan-400">{request.candidateName}</span>
          </h3>
          <p className="text-sm text-slate-300">
            Resume: {request.resumeTitle}
          </p>
          {request.message && (
            <p className="text-slate-400 mt-1 text-sm italic">
              "{request.message}"
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Sent on {formatDateTime(request.timestamp)}
          </p>

          {isApproved && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
              {accessExpired ? (
                <p className="font-medium text-red-300">
                  Access expired. Request access again to view this resume.
                </p>
              ) : (
                <p className="font-medium text-cyan-200">
                  Time left: {timeState.label}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {accessExpired
                  ? "The previous approval period ended."
                  : `Expires ${formatDateTime(request.expiresAt)}`}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`px-3 py-1 text-xs font-bold rounded uppercase tracking-wide ${
              request.status === "approved"
                ? "bg-green-500/20 text-green-300"
                : request.status === "denied"
                ? "bg-red-500/20 text-red-300"
                : "bg-yellow-500/20 text-yellow-300"
            }`}
          >
            {request.status}
          </span>

          {hasActiveAccess && (
            <Link
              href={`/resumes/${request.resumeId}`}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 rounded-lg transition-colors font-medium text-sm"
            >
              View Resume
            </Link>
          )}

          {accessExpired && (
            <button
              onClick={() => onReRequest(request)}
              className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 rounded-lg transition-colors font-medium text-sm"
            >
              Request Again
            </button>
          )}

          <button
            onClick={() => onDelete(request)}
            className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10"
            title="Delete Request"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
