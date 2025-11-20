"use client";

import { useState } from "react";
import {
  SearchInterface,
  RecruiterSearchFilters,
  SearchResult,
} from "@/components/recruiter/SearchInterface";
import { useAuth } from "@/hooks/useAuth";

export default function RecruiterSearchPage() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Candidate Search
        </h1>
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
