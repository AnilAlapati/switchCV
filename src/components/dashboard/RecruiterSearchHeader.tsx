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
      ? "AI Searching"
      : "Searching"
    : searched
    ? "Live Results"
    : "Ready";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 backdrop-blur-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`}></span>
        <span className="text-xs font-semibold text-slate-300">
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
          <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
              Recruiter Workspace
            </span>
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-3xl font-black text-transparent lg:text-4xl">
              Resume Search
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 lg:text-base">
              Discover talent instantly with advanced filters and real-time
              insights
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
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm ring-1 ring-white/5 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        </div>
      </div>
    </section>
  );
}
