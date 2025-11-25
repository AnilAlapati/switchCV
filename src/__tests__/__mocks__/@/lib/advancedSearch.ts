// src/__tests__/__mocks__/@/lib/advancedSearch.ts
export const performFullTextSearch = jest.fn();
export const applyAdvancedFilters = jest.fn();
export const paginateResults = jest.fn();
export const saveSavedSearch = jest.fn();
export const setupSearchAlert = jest.fn();

export interface SearchFilters {
  keywords?: string[];
  roles?: string[];
  locations?: string[];
  skills?: string[];
  minExperience?: number;
  maxDistance?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: Date;
  isActive: boolean;
  alertFrequency?: "daily" | "weekly" | "monthly";
}

export interface SearchResult {
  profiles: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  took: number;
}
