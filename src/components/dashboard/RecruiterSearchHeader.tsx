"use client";

import type { ReactElement } from "react";

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
}: SearchStatusIndicatorProps): ReactElement {
  const isSearching = loading || aiSearching;
  const statusColor = isSearching
    ? "animate-pulse bg-yellow-400"
    : searched
      ? "bg-black"
      : "bg-gray-400";

  const statusText = isSearching
    ? aiSearching
      ? "Agent Searching"
      : "Searching"
    : searched
      ? "Live Results"
      : "Ready";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 border-2 border-black bg-white px-4 py-2">
        <span className={`h-2.5 w-2.5 ${statusColor}`}></span>
        <span className="text-xs font-mono font-bold text-black uppercase tracking-widest">
          {statusText}
        </span>
      </div>
      {searched && (
        <span className="hidden text-xs text-gray-500 font-sans lg:inline">
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
}: RecruiterSearchHeaderProps): ReactElement {
  return (
    <header className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
            <span className="h-1 w-1 bg-black" />
            Recruiter Workspace
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold text-black lg:text-4xl">
              Talent <span className="text-blue-600">Discovery Agent</span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 font-sans lg:text-base">
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

export function RecruiterSearchLoadingState(): ReactElement {
  return (
    <section className="space-y-6">
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin border-4 border-black border-t-transparent" role="status" />
        </div>
      </div>
    </section>
  );
}
