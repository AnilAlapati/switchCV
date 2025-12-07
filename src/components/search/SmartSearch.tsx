"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import {
  SmartSearchResultCard,
  SmartSearchResult,
} from "./SmartSearchResultCard";
import { logger } from "@/lib/logger";

interface SmartSearchResponse {
  results: SmartSearchResult[];
  totalResults: number;
  quotaRemaining: number;
  quotaLimit: number;
}

interface SmartSearchProps {
  onResultSelect?: (result: SmartSearchResult) => void;
}

export function SmartSearch({ onResultSelect }: SmartSearchProps) {
  const { user, loading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{
    remaining: number;
    limit: number;
  } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async () => {
    if (!user) {
      setError("Please sign in to use AI-powered search");
      return;
    }

    if (!query.trim() || query.length < 10) {
      setError(
        "Please enter a more detailed search query (at least 10 characters)"
      );
      return;
    }

    setSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/search/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 403) {
          if (errorData.code === "QUOTA_EXCEEDED") {
            setError(
              `You've reached your monthly search limit (${errorData.quotaLimit} searches). Upgrade to Enterprise for unlimited searches.`
            );
          } else if (errorData.code === "TIER_NOT_ALLOWED") {
            setError(
              "AI-powered search requires a Premium or Enterprise subscription. Please upgrade to access this feature."
            );
          } else {
            setError(errorData.message || "Access denied");
          }
          return;
        }

        throw new Error(errorData.message || "Search failed");
      }

      const data: SmartSearchResponse = await response.json();
      setResults(data.results);
      setQuota({
        remaining: data.quotaRemaining,
        limit: data.quotaLimit,
      });
    } catch (err) {
      logger.error({ err }, "Smart search error");
      setError(
        err instanceof Error ? err.message : "Search failed. Please try again."
      );
    } finally {
      setSearching(false);
    }
  }, [user, query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      performSearch();
    }
  };

  if (authLoading) {
    return (
      <div className="glass-panel p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-[#2C4A3B]/10 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-[#2C4A3B]/10 rounded mb-4"></div>
          <div className="h-10 bg-[#2C4A3B]/10 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass-panel p-6">
        <h3 className="text-xl font-bold text-[#1A2F25] mb-4">
          🔮 AI-Powered Smart Search
        </h3>
        <p className="text-[#1A2F25]/70 mb-4">
          Sign in to use our AI-powered search that understands what you&apos;re
          looking for.
        </p>
        <Link
          href="/auth"
          className="glass-button inline-block bg-[#2C4A3B] hover:bg-[#1A2F25] text-white px-6 py-2 rounded-lg transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[#1A2F25] flex items-center gap-2">
          <span>🔮</span>
          <span>AI-Powered Smart Search</span>
          <span className="ml-2 px-2 py-1 bg-gradient-to-r from-[#2C4A3B] to-emerald-600 text-white text-xs rounded-full">
            Premium
          </span>
        </h3>
        {quota && (
          <div className="text-sm text-[#1A2F25]/60">
            {quota.limit === -1 ? (
              <span className="text-emerald-600 font-bold">Unlimited searches</span>
            ) : (
              <span>
                {quota.remaining}/{quota.limit} searches remaining
              </span>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-[#1A2F25]/70 text-sm mb-4">
        Describe the ideal candidate using natural language. Our AI understands
        context, skills, and experience to find the best matches.
      </p>

      {/* Search Input */}
      <div className="mb-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Looking for a senior React developer with 5+ years experience who has worked on e-commerce platforms and understands AWS..."
          className="glass-input w-full px-4 py-3 rounded-lg text-[#1A2F25] placeholder-[#2C4A3B]/40 focus:outline-none focus:ring-2 focus:ring-[#2C4A3B]/20 resize-none shadow-inner"
          rows={3}
          disabled={searching}
        />
        <p className="text-xs text-[#2C4A3B]/60 mt-1">
          Press Enter to search • Be as specific as possible for better results
        </p>
      </div>

      {/* Search Button */}
      <button
        onClick={performSearch}
        disabled={searching || !query.trim()}
        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#2C4A3B] to-emerald-600 hover:from-[#1A2F25] hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        {searching ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Searching with AI...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>Smart Search</span>
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
          {error.includes("upgrade") && (
            <Link
              href="/settings/subscription"
              className="block mt-2 text-red-700 hover:text-red-800 underline font-medium"
            >
              View subscription plans →
            </Link>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-bold text-[#1A2F25] mb-4">
            Found {results.length} matching profile
            {results.length !== 1 ? "s" : ""}
          </h4>
          <div className="space-y-4">
            {results.map((result) => (
              <SmartSearchResultCard
                key={result.resumeId}
                result={result}
                onSelect={onResultSelect}
              />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {hasSearched && !searching && !error && results.length === 0 && (
        <div className="mt-6 text-center py-8">
          <p className="text-[#2C4A3B]/60">
            No matching profiles found. Try adjusting your search criteria.
          </p>
        </div>
      )}
    </div>
  );
}
