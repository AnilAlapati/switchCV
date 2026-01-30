/* eslint-disable max-lines */
import { Dispatch, SetStateAction, useRef } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

export interface SearchResult {
  resumeId: string;
  title: string;
  userName: string;
  userId: string;
  skills?: string[];
  location?: string;
  createdAt: string;
  accessStatus?: "none" | "pending" | "approved" | "denied";
  summary?: string; // AI-generated or profile summary
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

  // Helper copy logic exists but is not currently used in UI
  // searchMode === "basic"
  //   ? "Directly retrieve a professional profile using a specific Resume ID."
  //   : searchMode === "ai"
  //   ? "Describe your ideal candidate in natural language. Our autonomous agent will find the best matches."
  //   : "Combine skills and location to surface up to 50 curated resumes in one pass"

  return (
    <div className="space-y-6">
      {/* Search Mode Selector */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 bg-black animate-pulse"></div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
              Search Mode
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 border border-gray-200">
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
                  <h3 className="mb-1 text-sm font-bold text-[black]">
                    Agent Search
                  </h3>
                  <p className="mb-4 text-xs text-[black]/60">
                    Unlock with Premium or Enterprise
                  </p>
                  <Link
                    href="/profile/subscription"
                    className="bg-black px-4 py-2 text-xs font-bold text-white border-2 border-black transition-colors hover:bg-white hover:text-black"
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-[black]/40">
                      Agentic
                    </span>
                  </div>
                  <div>
                    <span className="block font-bold text-[black]">
                      Agent Search
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
                className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                  searchMode === "ai"
                    ? "border-teal-400 bg-gradient-to-br from-cyan-100 to-teal-100 text-slate-800 shadow-lg shadow-teal-200/50"
                    : "border-slate-200/80 bg-white/80 hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-md hover:scale-[1.01]"
                }`}
              >
                <div className="flex w-full items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all duration-300 ${
                      searchMode === "ai"
                        ? "bg-white/20 text-white"
                        : "bg-indigo-100 text-indigo-500 group-hover:bg-indigo-200 group-hover:text-indigo-600"
                    }`}
                  >
                    ✨
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      searchMode === "ai" ? "text-teal-700" : "text-indigo-400"
                    }`}
                  >
                    Agentic
                  </span>
                </div>
                <div>
                  <span
                    className={`block font-bold ${
                      searchMode === "ai"
                        ? "text-teal-900"
                        : "text-slate-800 group-hover:text-indigo-700"
                    }`}
                  >
                    Agent Search
                  </span>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      searchMode === "ai" ? "text-teal-700" : "text-slate-500"
                    }`}
                  >
                    Natural language search powered by autonomous agents
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Basic Lookup Mode */}
          <button
            type="button"
            onClick={() => handleModeSwitch("basic")}
            className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
              searchMode === "basic"
                ? "border-blue-400 bg-gradient-to-br from-blue-100 to-sky-100 text-slate-800 shadow-lg shadow-blue-200/50"
                : "border-slate-200/80 bg-white/80 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md hover:scale-[1.01]"
            }`}
          >
            <div className="flex w-full items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-base font-black transition-all duration-300 ${
                  searchMode === "basic"
                    ? "bg-blue-200/50 text-blue-700"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                }`}
              >
                ID
              </div>
            </div>
            <div>
              <span
                className={`block text-base font-bold transition-colors ${
                  searchMode === "basic"
                    ? "text-blue-900"
                    : "text-slate-800 group-hover:text-slate-900"
                }`}
              >
                Basic Lookup
              </span>
              <p
                className={`mt-1.5 text-xs leading-relaxed ${
                  searchMode === "basic" ? "text-blue-700" : "text-slate-500"
                }`}
              >
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
                  <h3 className="mb-1 text-sm font-bold text-[black]">
                    Premium Filters
                  </h3>
                  <p className="mb-4 text-xs text-[black]/60">
                    Unlock with Premium or Enterprise
                  </p>
                  <Link
                    href="/profile/subscription"
                    className="bg-black px-4 py-2 text-xs font-bold text-white border-2 border-black transition-colors hover:bg-white hover:text-black"
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
                    <span className="block text-base font-bold text-[black]">
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
                className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                  searchMode === "premium"
                    ? "border-rose-300 bg-gradient-to-br from-rose-100 to-pink-100 text-slate-800 shadow-lg shadow-rose-200/50"
                    : "border-slate-200/80 bg-white/80 hover:border-rose-300 hover:bg-rose-50/40 hover:shadow-md hover:scale-[1.01]"
                }`}
              >
                <div className="flex w-full items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg transition-all duration-300 ${
                      searchMode === "premium"
                        ? "bg-rose-200/50 text-rose-700"
                        : "bg-amber-100 text-amber-500 group-hover:bg-amber-200 group-hover:text-amber-600"
                    }`}
                  >
                    ★
                  </div>
                </div>
                <div>
                  <span
                    className={`block text-base font-bold transition-colors ${
                      searchMode === "premium"
                        ? "text-rose-900"
                        : "text-slate-800 group-hover:text-amber-700"
                    }`}
                  >
                    Premium Filters
                  </span>
                  <p
                    className={`mt-1.5 text-xs leading-relaxed ${
                      searchMode === "premium"
                        ? "text-rose-700"
                        : "text-slate-500"
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
              <label className="flex items-center gap-2 text-sm font-semibold text-[black]">
                <span className="h-1 w-1 rounded-full bg-cyan-500"></span>
                Describe Your Ideal Candidate
              </label>
              {aiQuota && (
                <span className="text-xs text-[black]/60">
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
                className="w-full rounded-lg border-2 border-black bg-white px-4 py-3.5 text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50 resize-none"
              />
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-[black]/60">
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
                className="flex items-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || aiSearching ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
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
            <label className="flex items-center gap-2.5 text-sm font-semibold text-[black]">
              <span className="h-1.5 w-1.5 rounded-full bg-[black]"></span>
              Resume ID
            </label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition-colors group-focus-within:text-[black]">
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
                className="w-full rounded-lg border-2 border-black bg-white py-4 pl-12 pr-28 text-lg text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50"
              />
              <div className="absolute right-2 top-2 bottom-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-full rounded-lg bg-black px-4 font-bold text-white shadow-sm border-2 border-black transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <svg
                      className="h-4 w-4 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
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
                  Search
                </button>
              </div>
            </div>
            <p className="flex items-start gap-2.5 text-xs leading-relaxed text-[black]/60">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-[black]"
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
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[black]">
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
                  className="flex-1 rounded-lg border-2 border-black bg-white px-4 py-3 text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={commitSkill}
                  disabled={loading}
                  className="rounded-lg border-2 border-black bg-black px-6 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-60"
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
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[black]">
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
                  className="w-full rounded-lg border-2 border-black bg-white py-3.5 pl-11 pr-4 text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50"
                />
              </div>
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-[black]/60">
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
                className="flex items-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
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
