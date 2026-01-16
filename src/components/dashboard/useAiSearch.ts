import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { logger } from "@/lib/logger";
import type { SearchResult } from "./RecruiterSearchForm";

interface AiSearchResult {
  resumeId: number;
  title: string;
  summary: string;
  skills: string[];
  similarityScore: number;
}

interface UseAiSearchProps {
  user: User | null;
  setSearchResults: (results: SearchResult[]) => void;
  setSearched: (searched: boolean) => void;
  setNotification: (notification: string | null) => void;
}

export function useAiSearch({
  user,
  setSearchResults,
  setSearched,
  setNotification,
}: UseAiSearchProps) {
  const [aiQuery, setAiQuery] = useState("");
  const [aiSearching, setAiSearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiQuota, setAiQuota] = useState<{
    remaining: number;
    limit: number;
  } | null>(null);

  const handleAiSearch = useCallback(async () => {
    if (!user) {
      setAiError("Please sign in to use Agent search");
      return;
    }

    if (!aiQuery.trim() || aiQuery.length < 10) {
      setAiError(
        "Please enter a more detailed search query (at least 10 characters)"
      );
      return;
    }

    setAiSearching(true);
    setAiError(null);
    setSearchResults([]);
    setSearched(false);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/search/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: aiQuery.trim(),
          limit: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 403) {
          if (errorData.code === "QUOTA_EXCEEDED") {
            setAiError(
              `You've reached your monthly search limit. Upgrade to Enterprise for unlimited searches.`
            );
          } else if (errorData.code === "TIER_NOT_ALLOWED") {
            setAiError(
              "Agent-powered search requires a Premium or Enterprise subscription."
            );
          } else {
            setAiError(errorData.message || "Access denied");
          }
          return;
        }

        throw new Error(errorData.message || "Search failed");
      }

      const data = await response.json();

      // Transform AI search results to match SearchResult interface
      const transformedResults: SearchResult[] = (data.results || []).map(
        (result: AiSearchResult) => ({
          resumeId: String(result.resumeId),
          title: result.title || "Untitled",
          userName: "", // AI search doesn't return user name for privacy
          userId: "",
          skills: result.skills || [],
          location: "", // AI search doesn't return location for privacy
          createdAt: new Date().toISOString(),
          accessStatus: "none" as const,
          similarityScore: result.similarityScore,
          summary: result.summary,
        })
      );

      setSearchResults(transformedResults);
      setAiQuota({
        remaining: data.quotaRemaining,
        limit: data.quotaLimit || 50,
      });
      setSearched(true);

      if (transformedResults.length === 0) {
        setNotification(
          "No matching profiles found. Try adjusting your search criteria."
        );
      }
    } catch (err) {
      logger.error({ err }, "AI search error");
      setAiError(
        err instanceof Error ? err.message : "Search failed. Please try again."
      );
    } finally {
      setAiSearching(false);
    }
  }, [user, aiQuery, setSearchResults, setSearched, setNotification]);

  return {
    aiQuery,
    setAiQuery,
    aiSearching,
    aiError,
    aiQuota,
    handleAiSearch,
  };
}
