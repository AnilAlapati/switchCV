/**
 * Advanced Search Module
 * Provides full-text search, filtering, and saved searches for profile discovery
 */

import type { ProfileSearchResult } from "@/types/profileSearch";

/**
 * Search filters for advanced profile search
 */
export interface SearchFilters {
  [key: string]: string | string[] | number | boolean | undefined;
  skills?: string[];
  location?: string;
  role?: string;
  minExperience?: number;
  hasApproval?: boolean;
}

/**
 * Individual search result
 */
export interface SearchResult {
  totalResults: number;
  filteredResults: number;
  results: ProfileSearchResult[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Saved search configuration
 */
export interface SavedSearch {
  id: string;
  userId?: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: Date;
  updatedAt?: Date;
  isActive?: boolean;
  alertEnabled?: boolean;
  alertFrequency?: "daily" | "weekly" | "monthly" | "instantly";
}

/**
 * Perform full-text search across profiles
 */
export function performFullTextSearch(
  query: string,
  profiles: ProfileSearchResult[],
  filters?: SearchFilters
): ProfileSearchResult[] {
  const lowerQuery = query.toLowerCase();
  let results = profiles.filter(
    (profile) =>
      profile.displayName.toLowerCase().includes(lowerQuery) ||
      profile.username.toLowerCase().includes(lowerQuery) ||
      profile.bio.toLowerCase().includes(lowerQuery) ||
      (profile.skills || []).some((skill) =>
        skill.toLowerCase().includes(lowerQuery)
      )
  );

  if (filters) {
    results = applyAdvancedFilters(results, filters);
  }

  return results;
}

/**
 * Apply advanced filters to search results
 */
export function applyAdvancedFilters(
  profiles: ProfileSearchResult[],
  filters: SearchFilters
): ProfileSearchResult[] {
  let filtered = [...profiles];

  if (
    filters.skills &&
    Array.isArray(filters.skills) &&
    filters.skills.length > 0
  ) {
    filtered = filtered.filter((profile) =>
      filters.skills!.some((skill) => (profile.skills || []).includes(skill))
    );
  }

  if (filters.location) {
    filtered = filtered.filter(
      (profile) =>
        profile.location &&
        profile.location
          .toLowerCase()
          .includes((filters.location as string).toLowerCase())
    );
  }

  if (filters.role) {
    filtered = filtered.filter(
      (profile) =>
        profile.role &&
        profile.role
          .toLowerCase()
          .includes((filters.role as string).toLowerCase())
    );
  }

  if (filters.hasApproval === true) {
    filtered = filtered.filter((profile) => profile.hasApproval);
  }

  return filtered;
}

/**
 * Paginate search results
 */
export function paginateResults(
  results: ProfileSearchResult[],
  pageNumber: number,
  pageSize: number
): SearchResult {
  const startIndex = (pageNumber - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedResults = results.slice(startIndex, endIndex);

  return {
    totalResults: results.length,
    filteredResults: results.length,
    results: paginatedResults,
    pageNumber,
    pageSize,
    totalPages: Math.ceil(results.length / pageSize),
  };
}

/**
 * Save a search configuration
 */
export function saveSavedSearch(
  nameOrSearch: string | SavedSearch,
  query?: string,
  filters?: SearchFilters
): SavedSearch {
  if (typeof nameOrSearch === "object") {
    // Called with SavedSearch object
    return nameOrSearch;
  }

  // Called with separate parameters
  return {
    id: `search_${Date.now()}`,
    name: nameOrSearch,
    query: query || "",
    filters: filters || {},
    createdAt: new Date(),
    updatedAt: new Date(),
    alertEnabled: false,
  };
}

/**
 * Setup search alert for saved search
 */
export function setupSearchAlert(
  searchOrId: string | SavedSearch,
  frequency: "daily" | "weekly" | "monthly" | "instantly"
): SavedSearch {
  if (typeof searchOrId === "object") {
    // Called with SavedSearch object
    return {
      ...searchOrId,
      alertEnabled: true,
      alertFrequency: frequency,
    };
  }

  // Called with ID string
  return {
    id: searchOrId,
    name: "",
    query: "",
    filters: {},
    createdAt: new Date(),
    alertEnabled: true,
    alertFrequency: frequency,
  };
}
