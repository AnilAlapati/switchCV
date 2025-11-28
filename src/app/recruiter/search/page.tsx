"use client";

import { useEffect, useState } from "react";
import {
  SearchInterface,
  RecruiterSearchFilters,
  SearchResult,
} from "@/components/recruiter/SearchInterface";
import { SmartSearch } from "@/components/search/SmartSearch";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";

type SearchMode = "ai" | "basic";

export default function RecruiterSearchPage() {
  const { user, loading: authLoading, needsEmailVerification } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("ai");

  const loading = authLoading || profileLoading;

  useEffect(() => {
    if (!loading) {
      if (!user || needsEmailVerification) {
        router.replace("/auth?mode=verify-email");
      } else if (!role) {
        router.replace("/select-role");
      } else if (role !== "recruiter" && role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [loading, user, needsEmailVerification, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400">Preparing recruiter search…</p>
      </div>
    );
  }

  if (!user || needsEmailVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-400">Redirecting to sign in…</p>
      </div>
    );
  }

  const handleSearch = async (filters: RecruiterSearchFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/profiles/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: filters.query,
          filters: {
            role: filters.targetRole,
            location: filters.location,
            skills: filters.skills,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Candidate Search</h1>

        {/* Search Mode Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSearchMode("ai")}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              searchMode === "ai"
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
            }`}
          >
            <span>✨</span>
            AI Search
            <span className="text-xs px-1.5 py-0.5 bg-white/20 rounded">
              Premium
            </span>
          </button>
          <button
            onClick={() => setSearchMode("basic")}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              searchMode === "basic"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
            }`}
          >
            <span>🔍</span>
            Basic Search
          </button>
        </div>

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
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
