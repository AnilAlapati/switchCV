"use client";

import React, { useEffect, useState } from "react";
import {
  SearchInterface,
  RecruiterSearchFilters,
} from "@/components/recruiter/SearchInterface";
import { SmartSearch } from "@/components/search/SmartSearch";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { getVerificationRoute } from "@/lib/config";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";

type SearchMode = "ai" | "basic";

const VERIFICATION_ROUTE = getVerificationRoute();

import { useRecruiterSearch } from "@/hooks/useRecruiterSearch";

export default function RecruiterSearchPage() {
  const { user, loading: authLoading, needsEmailVerification } = useAuth();
  const { role, tier, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  const [activeFilters, setActiveFilters] =
    useState<RecruiterSearchFilters | null>(null);
  // Use SWR hook for search results
  const {
    results,
    loading: searchLoading,
    error: searchError,
  } = useRecruiterSearch(activeFilters);

  // Initialize search mode based on tier
  const [searchMode, setSearchMode] = useState<SearchMode>("basic");
  const [hasInitializedMode, setHasInitializedMode] = useState(false);

  // Combine error sources
  const error = searchError;

  const loading = authLoading || profileLoading;
  const isBasicTier = tier === "basic";

  // Initialize search mode when tier is available (avoiding setState in effect)
  React.useEffect(() => {
    if (!loading && tier && !hasInitializedMode) {
      // Only set mode once during initialization
      const initialMode = tier !== "basic" ? "ai" : "basic";
      setSearchMode(initialMode);
      setHasInitializedMode(true);
    }
  }, [loading, tier, hasInitializedMode]);

  useEffect(() => {
    if (!loading) {
      if (!user || needsEmailVerification) {
        router.replace(VERIFICATION_ROUTE);
      } else if (!role) {
        router.replace("/select-role");
      } else if (role !== "recruiter" && role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [loading, user, needsEmailVerification, role, router]);

  if (loading) {
    return (
      <DashboardBackground>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          <p className="text-slate-900 font-medium relative z-10">
            Preparing recruiter search…
          </p>
        </div>
      </DashboardBackground>
    );
  }

  if (!user || needsEmailVerification) {
    return (
      <DashboardBackground>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          <p className="text-slate-900 font-medium relative z-10">
            Redirecting to sign in…
          </p>
        </div>
      </DashboardBackground>
    );
  }

  const handleSearch = async (filters: RecruiterSearchFilters) => {
    setActiveFilters(filters);
    // State update triggers re-render -> hook runs -> data fetched
  };

  return (
    <DashboardBackground>
      <div className="min-h-screen text-slate-900 relative">
        <div className="relative z-10 max-w-7xl mx-auto p-8">
          <h1 className="text-3xl font-bold font-serif text-slate-900 mb-6">
            Candidate Search
          </h1>

          {/* Search Mode Tabs */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => !isBasicTier && setSearchMode("ai")}
              disabled={isBasicTier}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 border-2 text-sm ${isBasicTier
                ? "bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed text-slate-400"
                : searchMode === "ai"
                  ? "bg-black border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                  : "bg-white border-black text-slate-900 hover:bg-slate-50"
                }`}
            >
              <span>✨</span>
              AI Search
              <span className="text-xs px-1.5 py-0.5 bg-white/20 rounded font-bold border border-white/50">
                Premium
              </span>
            </button>
            <button
              onClick={() => setSearchMode("basic")}
              className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 border-2 text-sm ${searchMode === "basic"
                ? "bg-black border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                : "bg-white border-black text-slate-900 hover:bg-slate-50"
                }`}
            >
              <span>🔍</span>
              Basic Search
            </button>
          </div>

          {/* Upgrade Banner for Basic Tier */}
          {isBasicTier && (
            <div className="bg-white p-4 mb-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border-2 border-slate-200">
                    <span className="text-xl">✨</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 mb-1">
                      Unlock AI-Powered Search
                    </h3>
                    <p className="text-sm text-slate-600 font-medium">
                      Upgrade to Premium or Enterprise to use our intelligent
                      semantic search and find candidates faster.
                    </p>
                  </div>
                </div>
                <a
                  href="/profile/subscription"
                  className="px-4 py-2 bg-black border-2 border-black text-white rounded-lg font-bold hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] transition-all flex-shrink-0"
                >
                  Upgrade Now
                </a>
              </div>
            </div>
          )}

          {/* AI Search Mode */}
          {searchMode === "ai" && (
            <div className="mb-8">
              <SmartSearch />
            </div>
          )}

          {/* Basic Search Mode */}
          {searchMode === "basic" && (
            <SearchInterface
              onSearch={handleSearch}
              results={results}
              isLoading={searchLoading}
              error={error}
            />
          )}
        </div>
      </div>
    </DashboardBackground>
  );
}
