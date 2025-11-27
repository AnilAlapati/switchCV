/* eslint-disable max-lines */
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export interface SearchResult {
  resumeId: string;
  title: string;
  userName: string;
  userId: string;
  skills?: string[];
  location?: string;
  createdAt: string;
  accessStatus?: "none" | "pending" | "approved" | "denied";
}

export type SearchModeType = "basic" | "premium" | "ai";

interface RecruiterSearchFormProps {
  searchMode: SearchModeType;
  setSearchMode: Dispatch<SetStateAction<SearchModeType>>;
  premiumFiltersEnabled: boolean;
  aiSearchEnabled: boolean;
  userId: string;
  setUserId: Dispatch<SetStateAction<string>>;
  skills: string[];
  location: string;
  setLocation: Dispatch<SetStateAction<string>>;
  loading: boolean;
  onSearch: (e: React.FormEvent) => Promise<void>;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (index: number) => void;
  searchResults: SearchResult[];
  setSearchResults: Dispatch<SetStateAction<SearchResult[]>>;
  setSearched: Dispatch<SetStateAction<boolean>>;
  // AI search props
  aiQuery?: string;
  setAiQuery?: Dispatch<SetStateAction<string>>;
  onAiSearch?: () => Promise<void>;
  aiSearching?: boolean;
  aiError?: string | null;
  aiQuota?: { remaining: number; limit: number } | null;
}

export function RecruiterSearchForm({
  searchMode,
  setSearchMode,
  premiumFiltersEnabled,
  aiSearchEnabled,
  userId,
  setUserId,
  skills,
  location,
  setLocation,
  loading,
  onSearch,
  onAddSkill,
  onRemoveSkill,
  setSearchResults,
  setSearched,
  aiQuery = "",
  setAiQuery,
  onAiSearch,
  aiSearching = false,
  aiError = null,
  aiQuota = null,
}: RecruiterSearchFormProps) {
  const skillInputRef = useRef<HTMLInputElement>(null);

  const resetSearchState = () => {
    setSearchResults([]);
    setSearched(false);
  };

  const handleModeSwitch = (mode: SearchModeType) => {
    if (!premiumFiltersEnabled && mode === "premium") {
      return;
    }
    if (!aiSearchEnabled && mode === "ai") {
      return;
    }
    setSearchMode(mode);
    resetSearchState();
  };

  const commitSkill = () => {
    const value = skillInputRef.current?.value ?? "";
    onAddSkill(value);
    if (skillInputRef.current) {
      skillInputRef.current.value = "";
    }
  };

  const helperCopy =
    searchMode === "basic"
      ? "Use Basic mode when you already have a unique candidate ID from your pipeline."
      : searchMode === "ai"
      ? "Describe your ideal candidate in natural language. Our AI will find the best matches."
      : "Combine skills and location to surface up to 50 curated resumes in one pass.";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-950/40 p-5 backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Search Mode
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            Switch Anytime
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* AI Search Mode */}
          <button
            type="button"
            onClick={() => handleModeSwitch("ai")}
            disabled={!aiSearchEnabled}
            className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${
              searchMode === "ai"
                ? "border-cyan-400/60 bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent shadow-lg shadow-cyan-500/20"
                : "border-white/10 bg-slate-900/40 hover:border-cyan-400/40 hover:bg-slate-900/60"
            } ${!aiSearchEnabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm ${
                    searchMode === "ai"
                      ? "bg-cyan-400/20 text-cyan-300 shadow-inner shadow-cyan-500/10"
                      : "bg-slate-800/60 text-slate-400 group-hover:bg-cyan-400/10 group-hover:text-cyan-400"
                  }`}
                >
                  ✨
                </span>
                <span
                  className={`text-sm font-bold ${
                    searchMode === "ai"
                      ? "text-cyan-100"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  AI Search
                </span>
                <span className="rounded bg-gradient-to-r from-cyan-500/30 to-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                  NEW
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                {aiSearchEnabled
                  ? "Natural language search powered by AI"
                  : "Requires Premium or Enterprise"}
              </p>
            </div>
          </button>

          {/* Basic Lookup Mode */}
          <button
            type="button"
            onClick={() => handleModeSwitch("basic")}
            className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${
              searchMode === "basic"
                ? "border-amber-400/60 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent shadow-lg shadow-amber-500/20"
                : "border-white/10 bg-slate-900/40 hover:border-amber-400/40 hover:bg-slate-900/60"
            }`}
          >
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    searchMode === "basic"
                      ? "bg-amber-400/20 text-amber-300 shadow-inner shadow-amber-500/10"
                      : "bg-slate-800/60 text-slate-400 group-hover:bg-amber-400/10 group-hover:text-amber-400"
                  }`}
                >
                  ID
                </span>
                <span
                  className={`text-sm font-bold ${
                    searchMode === "basic"
                      ? "text-amber-100"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  Basic Lookup
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Quick candidate retrieval using resume ID or user ID
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("premium")}
            disabled={!premiumFiltersEnabled}
            className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-300 ${
              searchMode === "premium"
                ? "border-purple-500/60 bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent shadow-lg shadow-purple-500/20"
                : "border-white/10 bg-slate-900/40 hover:border-purple-500/40 hover:bg-slate-900/60"
            } ${!premiumFiltersEnabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    searchMode === "premium"
                      ? "bg-purple-400/20 text-purple-300 shadow-inner shadow-purple-500/10"
                      : "bg-slate-800/60 text-slate-400 group-hover:bg-purple-400/10 group-hover:text-purple-400"
                  }`}
                >
                  ★
                </span>
                <span
                  className={`text-sm font-bold ${
                    searchMode === "premium"
                      ? "text-purple-100"
                      : "text-slate-300 group-hover:text-white"
                  }`}
                >
                  Premium Filters
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                {premiumFiltersEnabled
                  ? "Advanced search with skills and location filters"
                  : "Advanced filters will arrive soon for premium recruiters."}
              </p>
            </div>
          </button>
        </div>
        {!premiumFiltersEnabled && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Premium search is temporarily disabled while we build the dedicated
            plan.
          </p>
        )}
      </div>

      <form
        onSubmit={
          searchMode === "ai"
            ? (e) => {
                e.preventDefault();
                onAiSearch?.();
              }
            : onSearch
        }
        className="space-y-5"
      >
        {searchMode === "ai" ? (
          /* AI Search Input */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
                Describe Your Ideal Candidate
              </label>
              {aiQuota && (
                <span className="text-xs text-slate-400">
                  {aiQuota.limit === -1 ? (
                    <span className="text-green-400">Unlimited searches</span>
                  ) : (
                    <span>
                      {aiQuota.remaining}/{aiQuota.limit} searches left
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery?.(e.target.value)}
                placeholder="e.g., Looking for a Java developer with 10 years experience and cloud tools like AWS or Azure..."
                disabled={aiSearching}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3.5 text-white placeholder-slate-500 shadow-inner shadow-black/30 transition-all focus:border-cyan-400/60 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 disabled:opacity-50 resize-none"
              />
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
              <svg
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Use natural language to describe skills, experience level,
              technologies, or any requirements
            </p>
            {aiError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {aiError}
              </div>
            )}
          </div>
        ) : searchMode === "basic" ? (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <span className="h-1 w-1 rounded-full bg-amber-400"></span>
              Resume ID or User ID
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
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
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., 2"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3.5 pl-11 pr-4 text-white placeholder-slate-500 shadow-inner shadow-black/30 transition-all focus:border-amber-400/60 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-amber-400/20 disabled:opacity-50"
              />
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-400">
              <svg
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Enter the ID found in the resume URL (e.g., /resumes/2)
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <span className="h-1 w-1 rounded-full bg-purple-400"></span>
                Skills
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  ref={skillInputRef}
                  type="text"
                  placeholder="e.g., React, Python, AWS"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitSkill();
                    }
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/30 transition-all focus:border-purple-500/60 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={commitSkill}
                  disabled={loading}
                  className="rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-500/20 to-purple-600/10 px-6 py-3 text-sm font-bold text-purple-100 shadow-lg shadow-purple-500/10 transition-all hover:border-purple-400/60 hover:from-purple-500/30 hover:to-purple-600/20 hover:shadow-purple-500/20 disabled:opacity-60"
                >
                  Add Skill
                </button>
              </div>
              {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="group inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-gradient-to-r from-purple-500/15 to-purple-600/10 px-3.5 py-1.5 text-xs font-semibold text-purple-100 shadow-sm shadow-purple-500/10"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => onRemoveSkill(idx)}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-400/20 text-purple-300 transition-all hover:bg-purple-400/30 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <span className="h-1 w-1 rounded-full bg-purple-400"></span>
                Location
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
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
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, region, or remote"
                  disabled={loading}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 py-3.5 pl-11 pr-4 text-white placeholder-slate-500 shadow-inner shadow-black/30 transition-all focus:border-purple-500/60 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
                />
              </div>
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Leave blank to search across all locations
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 px-4 py-3.5 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <p className="text-xs leading-relaxed text-slate-300">
              {helperCopy}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || aiSearching}
          className={`group relative w-full overflow-hidden rounded-xl px-6 py-3.5 text-base font-bold text-white shadow-xl transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
            searchMode === "ai"
              ? "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40"
              : "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 shadow-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/40"
          }`}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading || aiSearching ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {searchMode === "ai" ? "Searching with AI..." : "Searching..."}
              </>
            ) : (
              <>
                {searchMode === "ai" ? (
                  <span className="text-lg">✨</span>
                ) : (
                  <svg
                    className="h-5 w-5"
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
                )}
                {searchMode === "ai" ? "Smart Search" : "Run Search"}
              </>
            )}
          </span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
        </button>
      </form>
    </div>
  );
}
