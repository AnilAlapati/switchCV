/* eslint-disable max-lines */
import { type ReactNode } from "react";
import { SearchResult } from "./RecruiterSearchForm";

interface RecruiterSearchResultsProps {
  results: SearchResult[];
  searched: boolean;
  error: string | null;
  notification: string | null;
  searchMode: "basic" | "premium";
  onViewResume: (resumeId: string) => void;
  onRequestAccess?: (resumeId: string, userName: string) => void;
}

const badgeStyles: Record<
  NonNullable<SearchResult["accessStatus"]>,
  { label: string; classes: string; helper: string }
> = {
  approved: {
    label: "Approved",
    classes:
      "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40 shadow-lg shadow-emerald-500/10",
    helper: "Full resume unlocked and ready to view",
  },
  pending: {
    label: "Pending",
    classes:
      "bg-amber-500/15 text-amber-200 border border-amber-400/40 shadow-lg shadow-amber-500/10",
    helper: "You'll be notified when the candidate responds",
  },
  denied: {
    label: "Denied",
    classes:
      "bg-rose-500/15 text-rose-200 border border-rose-400/40 shadow-lg shadow-rose-500/10",
    helper: "Consider personalizing your request and trying again",
  },
  none: {
    label: "Request Access",
    classes: "bg-slate-800/80 text-slate-200 border border-white/20",
    helper: "Send a personalized request to view full contact details",
  },
};

const Callout = ({
  variant,
  children,
}: {
  variant: "error" | "info";
  children: ReactNode;
}) => (
  <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 backdrop-blur-sm">
    <div
      className={`flex items-center gap-3 rounded-2xl border px-5 py-4 font-bold shadow-lg ${
        variant === "error"
          ? "border-rose-500/40 bg-rose-500/15 text-rose-100 shadow-rose-500/20"
          : "border-cyan-500/40 bg-cyan-500/15 text-cyan-100 shadow-cyan-500/20"
      }`}
    >
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
        {variant === "error" ? "!" : "i"}
      </span>
      {children}
    </div>
  </section>
);

export function RecruiterSearchResults({
  results,
  searched,
  error,
  notification,
  searchMode,
  onViewResume,
  onRequestAccess,
}: RecruiterSearchResultsProps) {
  if (error) {
    return <Callout variant="error">{error}</Callout>;
  }

  if (notification) {
    return <Callout variant="info">{notification}</Callout>;
  }

  const hasResults = searched && results.length > 0;

  if (hasResults) {
    return (
      <section className="space-y-5">
        <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950/90 to-slate-900/70 px-6 py-5 shadow-xl shadow-slate-950/40 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Search Complete
              </p>
            </div>
            <h3 className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-2xl font-black text-transparent">
              {results.length} resume{results.length === 1 ? "" : "s"} found
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Results sorted by recency. Refine filters to narrow down.
          </p>
        </div>

        <div className="space-y-4">
          {results.map((result) => {
            const status = result.accessStatus ?? "none";
            const badge = badgeStyles[status];
            const created = new Date(result.createdAt).toLocaleDateString();

            const actionArea = () => {
              if (status === "approved") {
                return (
                  <button
                    onClick={() => onViewResume(result.resumeId)}
                    className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/40"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                      View Full Resume
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                  </button>
                );
              }
              if (status === "pending") {
                return (
                  <button
                    disabled
                    className="w-full rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm font-bold text-amber-100 shadow-lg shadow-amber-500/10"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Request Pending
                    </span>
                  </button>
                );
              }
              if (status === "denied") {
                return (
                  <button
                    onClick={() =>
                      onRequestAccess?.(result.resumeId, result.userName)
                    }
                    className="group w-full rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100 transition-all hover:border-rose-400/60 hover:bg-rose-500/20 hover:shadow-lg hover:shadow-rose-500/20"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Request Again
                    </span>
                  </button>
                );
              }
              return (
                <button
                  onClick={() =>
                    onRequestAccess?.(result.resumeId, result.userName)
                  }
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Request Access
                  </span>
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                </button>
              );
            };

            return (
              <article
                key={result.resumeId}
                className="group rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-slate-900/60 p-6 shadow-lg shadow-slate-950/40 backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-xl hover:shadow-cyan-500/10"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-200 ring-1 ring-cyan-400/30">
                        <svg
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-white">
                          {result.title}
                        </h4>
                        <p className="text-sm text-slate-400">
                          {result.userName}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-slate-300 backdrop-blur-sm">
                        #{result.userId.substring(0, 8)}
                      </span>
                    </div>

                    {result.skills && result.skills.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Core skills
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {result.skills.map((skill, idx) => (
                            <span
                              key={`${result.resumeId}-skill-${idx}`}
                              className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      {result.location && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 11c-3 0-5 2.239-5 5v2h10v-2c0-2.761-2-5-5-5z"
                            />
                          </svg>
                          {result.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                        Posted {created}
                      </span>
                    </div>
                  </div>

                  <div className="w-full rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-sm lg:w-80">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Access Status
                        </span>
                      </div>
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {searchMode === "basic" ? "Direct" : "Premium"}
                      </span>
                    </div>
                    <div
                      className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${badge.classes}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                      {badge.label}
                    </div>
                    <p className="mb-5 text-xs leading-relaxed text-slate-400">
                      {badge.helper}
                    </p>
                    {actionArea()}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  if (searched && results.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-12 text-center text-slate-300">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-900">
          <svg
            className="h-8 w-8 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </div>
        <p className="text-lg font-semibold text-white">No resumes found</p>
        <p className="text-sm text-slate-400">
          Adjust your filters or widen the location range to discover more
          talent.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-12 text-center text-slate-300">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-cyan-500/10">
        <svg
          className="h-8 w-8 text-cyan-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <p className="text-lg font-semibold text-white">Ready when you are</p>
      <p className="text-sm text-slate-400">
        {searchMode === "basic"
          ? "Enter a resume ID or user ID to pull a single candidate."
          : "Add at least one skill or a location to preview premium matches."}
      </p>
    </section>
  );
}
