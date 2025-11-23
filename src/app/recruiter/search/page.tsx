"use client";

import { useEffect, useState } from "react";
import {
  SearchInterface,
  RecruiterSearchFilters,
  SearchResult,
} from "@/components/recruiter/SearchInterface";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function RecruiterSearchPage() {
  const { user, loading, needsEmailVerification } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || needsEmailVerification)) {
      router.replace("/auth?mode=verify-email");
    }
  }, [loading, user, needsEmailVerification, router]);

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
        <h1 className="text-3xl font-bold text-white mb-8">Candidate Search</h1>
        <SearchInterface
          onSearch={handleSearch}
          results={results}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
}
