import { Dispatch, SetStateAction, useRef } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";

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
      ? "Directly retrieve a professional profile using a specific Resume ID."
      : searchMode === "ai"
        ? "Describe your ideal candidate in natural language. Our AI will find the best matches."
        : "Combine skills and location to surface up to 50 curated resumes in one pass.";

  return (
    <div className="space-y-6">
      {/* Search Mode Selector */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm border border-[#2C4A3B]/10">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[#2C4A3B] animate-pulse"></div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2C4A3B]/70">
              Search Mode
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-[#2C4A3B]/40 bg-[#2C4A3B]/5 px-2 py-0.5 rounded-full">
            Switch Anytime
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* AI Search Mode */}
          <div className="relative h-full">
            {!aiSearchEnabled ? (
              <div className="group relative flex h-full flex-col gap-4 rounded-2xl border-2 border-slate-200/80 bg-white/80 p-5 text-left overflow-hidden">
                {/* Lock Overlay */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] p-4 text-center">
                  <div className="mb-3 rounded-2xl bg-white p-3 shadow-lg">
                    <Lock className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-[#1A2F25]">
                    AI Search
                  </h3>
                  <p className="mb-4 text-xs text-[#1A2F25]/60">
                    Unlock with Premium or Enterprise
                  </p>
                  <Link
                    href="/profile/subscription"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
                  >
                    Upgrade Now
                  </Link>
                </div>

                {/* Disabled Content (Blurred/Faded) */}
                <div className="opacity-20 blur-[1px] pointer-events-none flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500">
                      ✨
                    </div>
                    <span className="rounded-full bg-[#2C4A3B] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                      NEW
                    </span>
                  </div>
                  <div>
                    <span className="block font-bold text-[#1A2F25]">
                      AI Search
                    </span>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Requires Premium or Enterprise
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleModeSwitch("ai")}
                className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${searchMode === "ai"
                  ? "border-[#2C4A3B] bg-[#2C4A3B] text-white shadow-lg shadow-[#2C4A3B]/20"
                  : "border-slate-200/80 bg-white/80 hover:border-[#2C4A3B]/50 hover:bg-[#2C4A3B]/5 hover:shadow-md hover:scale-[1.01]"
                  }`}
              >
                <div className="flex w-full items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all duration-300 ${searchMode === "ai"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-[#2C4A3B]/10 group-hover:text-[#2C4A3B]"
                      }`}
                  >
                    ✨
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm ${searchMode === "ai"
                      ? "bg-white/20 text-white"
                      : "bg-[#2C4A3B] text-white"
                      }`}
                  >
                    NEW
                  </span>
                </div>
                <div>
                  <span
                    className={`block font-bold ${searchMode === "ai"
                      ? "text-white"
                      : "text-[#1A2F25] group-hover:text-[#2C4A3B]"
                      }`}
                  >
                    AI Search
                  </span>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${searchMode === "ai" ? "text-emerald-100" : "text-slate-500"
                      }`}
                  >
                    Natural language search powered by AI
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Basic Lookup Mode */}
          <button
            type="button"
            onClick={() => handleModeSwitch("basic")}
            className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${searchMode === "basic"
              ? "border-[#2C4A3B] bg-[#2C4A3B] text-white shadow-lg shadow-[#2C4A3B]/20"
              : "border-slate-200/80 bg-white/80 hover:border-[#2C4A3B]/50 hover:bg-[#2C4A3B]/5 hover:shadow-md hover:scale-[1.01]"
              }`}
          >
            <div className="flex w-full items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-base font-black transition-all duration-300 ${searchMode === "basic"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500 group-hover:bg-[#2C4A3B]/10 group-hover:text-[#2C4A3B]"
                  }`}
              >
                ID
              </div>
            </div>
            <div>
              <span
                className={`block text-base font-bold transition-colors ${searchMode === "basic"
                  ? "text-white"
                  : "text-[#1A2F25] group-hover:text-[#2C4A3B]"
                  }`}
              >
                Basic Lookup
              </span>
              <p className={`mt-1.5 text-xs leading-relaxed ${searchMode === "basic" ? "text-emerald-100" : "text-slate-500"
                }`}>
                Quickly retrieve a Specific candidate using their Resume ID
              </p>
            </div>
          </button>

          {/* Premium Filters Mode */}
          <div className="relative h-full">
            {!premiumFiltersEnabled ? (
              <div className="group relative flex h-full flex-col gap-4 rounded-2xl border-2 border-slate-200/80 bg-white/80 p-5 text-left overflow-hidden">
                {/* Lock Overlay */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] p-4 text-center">
                  <div className="mb-3 rounded-2xl bg-white p-3 shadow-lg">
                    <Lock className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="mb-1 text-sm font-bold text-[#1A2F25]">
                    Premium Filters
                  </h3>
                  <p className="mb-4 text-xs text-[#1A2F25]/60">
                    Unlock with Premium or Enterprise
                  </p>
                  <Link
                    href="/profile/subscription"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700"
                  >
                    Upgrade Now
                  </Link>
                </div>

                {/* Disabled Content (Blurred/Faded) */}
                <div className="opacity-20 blur-[1px] pointer-events-none flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-500">
                      ★
                    </div>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                      SOON
                    </span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-[#1A2F25]">
                      Premium Filters
                    </span>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      Advanced filters will arrive soon for premium recruiters.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleModeSwitch("premium")}
                className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${searchMode === "premium"
                  ? "border-[#2C4A3B] bg-[#2C4A3B] text-white shadow-lg shadow-[#2C4A3B]/20"
                  : "border-slate-200/80 bg-white/80 hover:border-[#2C4A3B]/50 hover:bg-[#2C4A3B]/5 hover:shadow-md hover:scale-[1.01]"
                  }`}
              >
                <div className="flex w-full items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg transition-all duration-300 ${searchMode === "premium"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-[#2C4A3B]/10 group-hover:text-[#2C4A3B]"
                      }`}
                  >
                    ★
                  </div>
                </div>
                <div>
                  <span
                    className={`block text-base font-bold transition-colors ${searchMode === "premium"
                      ? "text-white"
                      : "text-[#1A2F25] group-hover:text-[#2C4A3B]"
                      }`}
                  >
                    Premium Filters
                  </span>
                  <p
                    className={`mt-1.5 text-xs leading-relaxed ${searchMode === "premium" ? "text-emerald-100" : "text-slate-500"
                      }`}
                  >
                    Advanced search with skills and location filters
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>

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
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1A2F25]">
                <span className="h-1 w-1 rounded-full bg-cyan-500"></span>
                Describe Your Ideal Candidate
              </label>
              {aiQuota && (
                <span className="text-xs text-[#2C4A3B]/60">
                  {aiQuota.limit === -1 ? (
                    <span className="text-emerald-600">Unlimited searches</span>
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[#1A2F25] placeholder-slate-400 shadow-sm transition-all focus:border-cyan-500 focus:bg-cyan-50/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50 resize-none hover:border-cyan-300"
              />
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-[#2C4A3B]/60">
              <svg
                className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
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
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {aiError}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || aiSearching}
                className="flex items-center gap-2 rounded-xl bg-[#2C4A3B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2C4A3B]/20 transition-all hover:bg-[#20362B] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || aiSearching ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Smart Search
                  </>
                )}
              </button>
            </div>
          </div>
        ) : searchMode === "basic" ? (
          <div className="space-y-4">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-[#1A2F25]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2C4A3B]"></span>
              Resume ID
            </label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition-colors group-focus-within:text-[#2C4A3B]">
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
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-4 pl-12 pr-28 text-lg text-[#1A2F25] placeholder-slate-400 shadow-sm transition-all duration-300 focus:border-[#2C4A3B] focus:bg-emerald-50/10 focus:outline-none focus:ring-4 focus:ring-[#2C4A3B]/10 focus:shadow-lg focus:shadow-[#2C4A3B]/5 disabled:opacity-50 hover:border-[#2C4A3B]/50 hover:shadow-md"
              />
              <div className="absolute right-2 top-2 bottom-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-full rounded-xl bg-[#2C4A3B] px-4 font-bold text-white shadow-md transition-all hover:bg-[#20362B] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                  Search
                </button>
              </div>
            </div>
            <p className="flex items-start gap-2.5 text-xs leading-relaxed text-[#2C4A3B]/60">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2C4A3B]"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Enter the unique ID found in the resume URL
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1A2F25]">
                <span className="h-1 w-1 rounded-full bg-purple-500"></span>
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
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[#1A2F25] placeholder-slate-400 shadow-sm transition-all focus:border-purple-500 focus:bg-purple-50/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 hover:border-purple-300"
                />
                <button
                  type="button"
                  onClick={commitSkill}
                  disabled={loading}
                  className="rounded-xl border border-purple-200 bg-purple-50 px-6 py-3 text-sm font-bold text-purple-700 shadow-sm transition-all hover:border-purple-300 hover:bg-purple-100 disabled:opacity-60"
                >
                  Add Skill
                </button>
              </div>
              {skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="group inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-semibold text-purple-700"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => onRemoveSkill(idx)}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-purple-200 text-purple-600 transition-all hover:bg-purple-300 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#1A2F25]">
                <span className="h-1 w-1 rounded-full bg-purple-500"></span>
                Location
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
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
                  className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-[#1A2F25] placeholder-slate-400 shadow-sm transition-all focus:border-purple-500 focus:bg-purple-50/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 hover:border-purple-300"
                />
              </div>
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-[#2C4A3B]/60">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
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
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[#2C4A3B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#2C4A3B]/20 transition-all hover:bg-[#20362B] hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Run Filtered Search
                  </>
                )}
              </button>
            </div>
          </div>
        )}


      </form>
    </div>
  );
}
