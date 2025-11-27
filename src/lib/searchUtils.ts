// src/lib/searchUtils.ts
/**
 * Search Utility Functions Module
 */

import { logger } from "@/lib/logger";

export const validateSearchQuery = (
  query: string
): { valid: boolean; error?: string } => {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: "Search query cannot be empty" };
  }

  if (query.length > 500) {
    return {
      valid: false,
      error: "Search query is too long (max 500 characters)",
    };
  }

  return { valid: true };
};

export const getSearchSuggestions = (
  prefix: string,
  recentSearches: string[],
  topSearches: string[]
): string[] => {
  const normalizedPrefix = prefix.toLowerCase();
  const suggestions = new Set<string>();

  recentSearches.forEach((search) => {
    if (search.toLowerCase().includes(normalizedPrefix)) {
      suggestions.add(search);
    }
  });

  topSearches.forEach((search) => {
    if (search.toLowerCase().includes(normalizedPrefix)) {
      suggestions.add(search);
    }
  });

  return Array.from(suggestions).slice(0, 5);
};

export const exportSearchResults = (
  results: any[],
  format: "json" | "csv"
): string => {
  try {
    if (format === "json") {
      return JSON.stringify(results, null, 2);
    }

    if (format === "csv") {
      const headers = [
        "Username",
        "Display Name",
        "Role",
        "Location",
        "Skills",
        "Has Approval",
      ];
      const rows = results.map((profile) => [
        profile.username,
        profile.displayName,
        profile.role || "",
        profile.location || "",
        (profile.skills || []).join("; "),
        profile.hasApproval ? "Yes" : "No",
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      return csvContent;
    }

    throw new Error("Unsupported export format");
  } catch (error) {
    logger.error({ err: error }, "Error exporting search results:");
    throw new Error("Failed to export results");
  }
};
