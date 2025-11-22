// src/app/api/profiles/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProfileSearchResult } from "@/types/profileSearch";
import { handleApiError } from "@/lib/utils/api-helpers";

interface SearchRequest {
  query?: string;
  filters?: {
    role?: string;
    location?: string;
    skills?: string[];
    slug?: string;
  };
  limit?: number;
  offset?: number;
}

/**
 * Checks if all filter items are included in the target array
 */
function includesAllSkills(
  targetSkills: string[] = [],
  requiredSkills: string[] = []
): boolean {
  if (!requiredSkills || requiredSkills.length === 0) return true;
  return requiredSkills.every((skill) =>
    targetSkills.some((ts) => ts.toLowerCase().includes(skill.toLowerCase()))
  );
}

/**
 * Performs text search on string fields
 */
function matchesQuery(text: string = "", query: string = ""): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export async function POST(request: NextRequest) {
  try {
    const {
      query: searchQuery,
      filters,
      limit: resultLimit = 20,
      offset = 0,
    } = (await request.json()) as SearchRequest;

    // Build validation
    if (
      !searchQuery &&
      !filters?.slug &&
      Object.keys(filters || {}).length === 0
    ) {
      return handleApiError(
        null,
        "Either search query or filters are required",
        400
      );
    }

    const usersRef = collection(db, "users");

    // Build query constraints
    const constraints: QueryConstraint[] = [
      where("publicProfile.visible", "==", true),
      orderBy("displayName"),
      limit(resultLimit + offset), // Get extra for offset
    ];

    // Query with constraints
    const q = query(usersRef, ...constraints);
    const querySnapshot = await getDocs(q);

    // Filter and process results in memory
    const allResults: ProfileSearchResult[] = [];
    const seenUserIds = new Set<string>();

    for (const doc of querySnapshot.docs) {
      const userData = doc.data();
      const displayName = userData.displayName || "";
      const username = userData.publicProfile?.username || "";
      const slug = userData.profileSlug || "";
      const bio = userData.publicProfile?.aiSelectedBio || "";
      const role = userData.publicProfile?.role || "";
      const location = userData.publicProfile?.location || "";
      const skills = userData.publicProfile?.skills || [];

      // Skip duplicates
      if (seenUserIds.has(doc.id)) continue;

      // Apply filters
      const matchesSearch =
        !searchQuery ||
        matchesQuery(displayName, searchQuery) ||
        matchesQuery(username, searchQuery) ||
        matchesQuery(bio, searchQuery) ||
        matchesQuery(role, searchQuery);

      const matchesRole =
        !filters?.role || role.toLowerCase() === filters.role.toLowerCase();
      const matchesLocation =
        !filters?.location ||
        location.toLowerCase().includes(filters.location.toLowerCase());
      const matchesSkills = includesAllSkills(skills, filters?.skills);
      const matchesSlug = !filters?.slug || slug === filters.slug;

      // Check if all filters match
      if (
        !matchesSearch ||
        !matchesRole ||
        !matchesLocation ||
        !matchesSkills ||
        !matchesSlug
      ) {
        continue;
      }

      seenUserIds.add(doc.id);

      // Check if user has valid access grant from current user
      // TODO: Load from cache for performance
      const hasApproval = false; // TODO: Check access grants
      const approvalExpiresAt = undefined;

      allResults.push({
        userId: doc.id,
        username: username,
        displayName: displayName,
        photoURL: userData.photoURL,
        bio: bio,
        role: role || undefined,
        location: location || undefined,
        skills: skills.length > 0 ? skills : undefined,
        hasApproval,
        approvalExpiresAt,
      });
    }

    // Apply offset for pagination
    const paginatedResults = allResults.slice(offset, offset + resultLimit);

    console.log(
      `🔍 Search (query: "${searchQuery}", filters: ${JSON.stringify(
        filters
      )}) returned ${paginatedResults.length}/${allResults.length} results`
    );

    return NextResponse.json({
      results: paginatedResults,
      count: paginatedResults.length,
      total: allResults.length,
      query: searchQuery,
      filters,
      offset,
      hasMore: allResults.length > offset + resultLimit,
    });
  } catch (error) {
    return handleApiError(error, "Search failed");
  }
}
