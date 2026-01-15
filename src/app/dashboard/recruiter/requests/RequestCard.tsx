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
    <div className="group relative overflow-hidden rounded-xl border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
      {/* Accent line based on status */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 border-b-2 border-black ${hasActiveAccess
            ? "bg-emerald-400"
            : accessExpired
              ? "bg-rose-400"
              : "bg-cyan-400"
          }`}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mt-2">
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-serif font-bold text-slate-900 tracking-tight">
              {request.candidateName}
            </h3>
            <div className="flex items-center gap-2 mt-2">
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
              <p className="text-sm font-semibold text-slate-600">
                {request.resumeTitle}
              </p>
            </div>
          </div>

          {request.message && (
            <div className="pl-4 border-l-4 border-slate-200 py-1">
              <p className="text-sm text-slate-600 italic font-medium font-serif leading-relaxed">
                "{request.message}"
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-wider">
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
              className={`rounded-lg border-2 border-black p-4 ${accessExpired
                  ? "bg-rose-50"
                  : "bg-emerald-50"
                }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded border-2 border-black flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
                >
                  {accessExpired ? (
                    <svg
                      className="w-4 h-4 text-rose-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M9 12l2 2 4-4"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  {accessExpired ? (
                    <>
                      <p className="font-bold text-rose-900 text-sm font-serif">
                        Access Expired
                      </p>
                      <p className="text-xs text-rose-700 mt-0.5 font-medium">
                        Request access again to view this resume
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-emerald-900 text-sm font-serif">
                        Active Access • {timeState.label}
                      </p>
                      <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                        Expires {formatDateTime(request.expiresAt)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-4">
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full border-2 border-black uppercase tracking-wider ${request.status === "approved"
                ? "bg-emerald-100 text-emerald-800"
                : request.status === "denied"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800"
              }`}
          >
            {request.status}
          </span>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {hasActiveAccess && (
              <Link
                href={`/resumes/${request.resumeId}`}
                className="group/btn inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-slate-800 text-white border-2 border-black rounded-lg transition-all duration-200 font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px]"
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-indigo-700 border-2 border-indigo-700 rounded-lg transition-all duration-200 font-bold text-sm hover:shadow-md"
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
              className="group/del p-2.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all duration-200 border-2 border-transparent hover:border-rose-200"
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
    </div>
  );
}
