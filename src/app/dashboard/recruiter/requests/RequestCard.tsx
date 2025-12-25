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
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-950/80 backdrop-blur-sm p-7 shadow-xl hover:shadow-2xl hover:border-slate-700/70 transition-all duration-300">
      {/* Gradient accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          hasActiveAccess
            ? "bg-gradient-to-r from-green-500 to-emerald-500"
            : accessExpired
            ? "bg-gradient-to-r from-orange-500 to-red-500"
            : "bg-gradient-to-r from-cyan-500 to-blue-500"
        }`}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {request.candidateName}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm font-semibold text-slate-300">
                {request.resumeTitle}
              </p>
            </div>
          </div>

          {request.message && (
            <div className="pl-4 border-l-2 border-slate-700">
              <p className="text-sm text-slate-400 italic font-medium">
                "{request.message}"
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Sent {formatDateTime(request.timestamp)}</span>
          </div>

          {isApproved && (
            <div
              className={`rounded-xl border p-4 shadow-lg ${
                accessExpired
                  ? "border-red-800/50 bg-gradient-to-br from-red-950/40 to-red-900/20"
                  : "border-green-800/50 bg-gradient-to-br from-green-950/40 to-emerald-900/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    accessExpired ? "bg-red-500/20" : "bg-green-500/20"
                  }`}
                >
                  {accessExpired ? (
                    <svg
                      className="w-5 h-5 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  {accessExpired ? (
                    <>
                      <p className="font-bold text-red-300 text-sm">
                        Access Expired
                      </p>
                      <p className="text-xs text-red-400/80 mt-1">
                        Request access again to view this resume
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-green-300 text-sm">
                        Active Access • {timeState.label}
                      </p>
                      <p className="text-xs text-green-400/80 mt-1">
                        Expires {formatDateTime(request.expiresAt)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
          <span
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider shadow-lg ${
              request.status === "approved"
                ? "bg-gradient-to-r from-green-500/30 to-emerald-500/30 text-green-200 border border-green-500/30"
                : request.status === "denied"
                ? "bg-gradient-to-r from-red-500/30 to-rose-500/30 text-red-200 border border-red-500/30"
                : "bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-200 border border-yellow-500/30"
            }`}
          >
            {request.status}
          </span>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {hasActiveAccess && (
              <Link
                href={`/resumes/${request.resumeId}`}
                className="group/btn inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg transition-all duration-200 font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
              >
                <svg
                  className="w-4 h-4 transition-transform group-hover/btn:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Resume
              </Link>
            )}

            {accessExpired && (
              <button
                onClick={() => onReRequest(request)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-200 hover:text-indigo-100 rounded-lg transition-all duration-200 font-semibold text-sm border border-indigo-500/30"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Request Again
              </button>
            )}

            <button
              onClick={() => onDelete(request)}
              className="group/del p-2.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/30"
              title="Delete Request"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover/del:scale-110"
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
    </div>
  );
}
