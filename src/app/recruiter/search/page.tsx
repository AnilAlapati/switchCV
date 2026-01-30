"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  SearchInterface,
  RecruiterSearchFilters,
} from "@/components/recruiter/SearchInterface";
import { SmartSearch } from "@/components/search/SmartSearch";
import { JDUpload, type ParsedJDPreview } from "@/components/recruiter/JDUpload";
import { SearchResults, type SearchResult } from "@/components/recruiter/SearchResults";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { getVerificationRoute } from "@/lib/config";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { Search, FileText, Sparkles } from "lucide-react";

type SearchMode = "ai" | "basic" | "jd";

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

  // JD Search state
  const [jdResults, setJdResults] = useState<SearchResult[]>([]);
  const [jdLoading, setJdLoading] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);
  const [parsedJD, setParsedJD] = useState<ParsedJDPreview | null>(null);

  // Initialize search mode based on tier
  const [searchMode, setSearchMode] = useState<SearchMode>("basic");
  const [hasInitializedMode, setHasInitializedMode] = useState(false);

  // Combine error sources
  const error = searchError;

  const loading = authLoading || profileLoading;
  const isBasicTier = tier === "basic";

  // Initialize search mode when tier is available (avoiding setState in effect)
  React.useEffect(() => {
    if (!loading && tier !== undefined && !hasInitializedMode) {
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

  const handleSearch = async (filters: RecruiterSearchFilters) => {
    setActiveFilters(filters);
    // State update triggers re-render -> hook runs -> data fetched
  };

  const handleJDSearch = useCallback(async (jdText: string, useAI: boolean) => {
    if (!user) {
      setJdError("Please sign in to search");
      return;
    }

    setJdLoading(true);
    setJdError(null);
    setParsedJD(null);
    setJdResults([]);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/recruiter/jd-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ jdText, useAI }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setParsedJD(data.parsedJD);
      setJdResults(data.results.map((r: Record<string, unknown>) => ({
        userId: r.userId as string,
        userName: r.userName as string || "Unknown",
        title: r.title as string || "",
        skills: (r.skills as string[]) || [],
        matchScore: r.matchScore as number || 0,
        matchReason: r.matchReason as string || "",
        location: r.location as string || undefined,
      })));
    } catch (err) {
      setJdError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setJdLoading(false);
    }
  }, [user]);

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

  return (
    <DashboardBackground>
      <div className="min-h-screen text-slate-900 relative">
        <div className="relative z-10 max-w-7xl mx-auto p-8">
          <h1 className="text-3xl font-bold font-serif text-slate-900 mb-6">
            Candidate Search
          </h1>

          {/* Search Mode Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => !isBasicTier && setSearchMode("ai")}
              disabled={isBasicTier}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-sm ${isBasicTier
                ? "opacity-50 cursor-not-allowed text-gray-400"
                : searchMode === "ai"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Search
              <span className="text-xs px-1.5 py-0.5 bg-black/10 rounded font-medium">
                Premium
              </span>
            </button>
            <button
              onClick={() => setSearchMode("basic")}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-sm ${searchMode === "basic"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <Search className="w-4 h-4" />
              Basic Search
            </button>
            <button
              onClick={() => setSearchMode("jd")}
              className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 text-sm ${searchMode === "jd"
                ? "bg-white text-black shadow-sm"
                : "text-gray-600 hover:text-gray-900"
                }`}
              data-testid="jd-search-tab"
            >
              <FileText className="w-4 h-4" />
              Upload JD
            </button>
          </div>

          {/* Upgrade Banner for Basic Tier */}
          {isBasicTier && (
            <div className="bg-white p-4 mb-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border-2 border-slate-200">
                    <Sparkles className="w-5 h-5 text-white" />
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

          {/* JD Upload Search Mode */}
          {searchMode === "jd" && (
            <div className="space-y-6">
              <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Search by Job Description
                  </h2>
                  <p className="text-sm text-gray-600">
                    Paste or upload a job description to automatically find matching candidates.
                    Our AI extracts requirements and ranks candidates by fit.
                  </p>
                </div>
                <JDUpload
                  onSearch={handleJDSearch}
                  isLoading={jdLoading}
                  parsedJD={parsedJD}
                  error={jdError}
                />
              </div>

              {/* JD Search Results */}
              {(jdResults.length > 0 || jdLoading) && (
                <SearchResults
                  results={jdResults}
                  isLoading={jdLoading}
                  query={parsedJD?.title || "Job Description Search"}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardBackground>
  );
}

