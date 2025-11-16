// src/lib/searchFilters.ts
/**
 * Advanced Search Filters Module
 */

import type { ProfileSearchResult } from "@/types/profileSearch";

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

export const applyAdvancedFilters = (
  profiles: ProfileSearchResult[],
  filters: SearchFilters
): ProfileSearchResult[] => {
  return profiles.filter((profile) => {
    if (filters.roles && filters.roles.length > 0) {
      if (
        !profile.role ||
        !filters.roles.some((r) =>
          profile.role?.toLowerCase().includes(r.toLowerCase())
        )
      ) {
        return false;
      }
    }

    if (filters.locations && filters.locations.length > 0) {
      if (
        !profile.location ||
        !filters.locations.some((l) =>
          profile.location?.toLowerCase().includes(l.toLowerCase())
        )
      ) {
        return false;
      }
    }

    if (filters.skills && filters.skills.length > 0) {
      const requiredSkills = filters.skills.map((s) => s.toLowerCase());
      const profileSkills = (profile.skills || []).map((s) => s.toLowerCase());
      const hasAllSkills = requiredSkills.every((skill) =>
        profileSkills.some((ps) => ps.includes(skill) || skill.includes(ps))
      );
      if (!hasAllSkills) return false;
    }

    if (filters.dateRange && profile.requestedAt) {
      const profileDate = new Date(profile.requestedAt);
      if (
        profileDate < filters.dateRange.from ||
        profileDate > filters.dateRange.to
      ) {
        return false;
      }
    }

    return true;
  });
};
