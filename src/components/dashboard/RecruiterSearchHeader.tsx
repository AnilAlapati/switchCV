"use client";

/**
 * Search Header Component for RecruiterSearchBox
 * Displays the workspace title, status indicator, and search readiness
 */

interface SearchStatusIndicatorProps {
  loading: boolean;
  aiSearching: boolean;
  searched: boolean;
}

export function SearchStatusIndicator({
  loading,
  aiSearching,
  searched,
}: SearchStatusIndicatorProps) {
  const isSearching = loading || aiSearching;
  const statusColor = isSearching
    ? "animate-pulse bg-amber-400 shadow-lg shadow-amber-400/50"
    : searched
    ? "bg-emerald-400 shadow-lg shadow-emerald-400/50"
    : "bg-slate-500";

  const statusText = isSearching
    ? aiSearching
      ? "Agent Searching"
      : "Searching"
    : searched
    ? "Live Results"
    : "Ready";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-4 py-2 backdrop-blur-sm shadow-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`}></span>
        <span className="text-xs font-semibold text-slate-600">
          {statusText}
        </span>
      </div>
      {searched && (
        <span className="hidden text-xs text-slate-500 lg:inline">
          Updated just now
        </span>
      )}
    </div>
  );
}

interface RecruiterSearchHeaderProps {
  loading: boolean;
  aiSearching: boolean;
  searched: boolean;
}

export function RecruiterSearchHeader({
  loading,
  aiSearching,
  searched,
}: RecruiterSearchHeaderProps) {
  return (
    <header className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700/60">
            <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-600" />
            Recruiter Workspace
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#1A2F25] lg:text-4xl">
              Talent <span className="text-cyan-600">Discovery Agent</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#2C4A3B]/70 lg:text-base">
              Deploying autonomous intelligence to uncover your next hire.
            </p>
          </div>
        </div>
        <SearchStatusIndicator
          loading={loading}
          aiSearching={aiSearching}
          searched={searched}
        />
      </div>
    </header>
  );
}

export function RecruiterSearchLoadingState() {
  return (
    <section className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        </div>
      </div>
    </section>
  );
}
