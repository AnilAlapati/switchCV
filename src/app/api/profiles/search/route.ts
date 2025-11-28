// src/app/api/profiles/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { ProfileSearchResult } from "@/types/profileSearch";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { buildNormalizedFilters, matchesAllFilters } from "./search-query";
import { mapProfileResult } from "./search-utils";
import { logger } from "@/lib/logger";

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
  cursor?: string;
}

const MAX_PAGE_LIMIT = 50;
const MAX_FETCH_ROUNDS = 5;
const SEARCH_RATE_LIMIT = 30; // 30 searches per minute per user

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication for profile search
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError) return authError;

  // SECURITY: Apply distributed rate limiting (works across serverless instances)
  const rateCheck = await checkDistributedRateLimit(userId!, {
    limit: SEARCH_RATE_LIMIT,
    windowMs: 60 * 1000,
    scope: "profile-search",
  });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: "Too many search requests",
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateCheck.limit.toString(),
          "X-RateLimit-Remaining": rateCheck.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(
            Date.now() / 1000 + rateCheck.resetIn / 1000
          ).toString(),
        },
      }
    );
  }

  try {
    const {
      query: searchQuery,
      filters,
      limit: resultLimit = 20,
      offset = 0,
      cursor,
    } = (await request.json()) as SearchRequest;

    const normalizedFilters = buildNormalizedFilters(filters);
    const sanitizedQuery = searchQuery?.trim() || "";
    const normalizedLimit = Math.min(Math.max(resultLimit, 1), MAX_PAGE_LIMIT);
    const chunkSize = Math.min(normalizedLimit + 5, MAX_PAGE_LIMIT + 5);
    const desiredResultCount = cursor
      ? normalizedLimit
      : normalizedLimit + offset;

    if (
      !sanitizedQuery &&
      !normalizedFilters.slug &&
      Object.keys(filters || {}).length === 0
    ) {
      return handleApiError(
        null,
        "Either search query or filters are required",
        400
      );
    }

    if (normalizedFilters.slug) {
      // Slug search using admin SDK
      const slugSnapshot = await adminDb
        .collection("users")
        .where("publicProfile.visible", "==", true)
        .where("profileSlug", "==", normalizedFilters.slug)
        .limit(1)
        .get();

      const slugResults: ProfileSearchResult[] = slugSnapshot.docs.map(
        (docSnap) => mapProfileResult(docSnap.id, docSnap.data())
      );

      return NextResponse.json({
        results: slugResults,
        count: slugResults.length,
        total: slugResults.length,
        query: sanitizedQuery,
        filters,
        offset: 0,
        hasMore: false,
      });
    }

    // Build the base query using admin SDK
    let baseQuery = adminDb
      .collection("users")
      .where("publicProfile.visible", "==", true);

    if (normalizedFilters.role) {
      baseQuery = baseQuery.where(
        "publicProfile.role",
        "==",
        normalizedFilters.role
      );
    }

    if (normalizedFilters.location) {
      baseQuery = baseQuery.where(
        "publicProfile.location",
        "==",
        normalizedFilters.location
      );
    }

    if (normalizedFilters.skills.length === 1) {
      baseQuery = baseQuery.where(
        "publicProfile.skills",
        "array-contains",
        normalizedFilters.skills[0]
      );
    } else if (normalizedFilters.skills.length > 1) {
      baseQuery = baseQuery.where(
        "publicProfile.skills",
        "array-contains-any",
        normalizedFilters.skills.slice(0, 10)
      );
    }

    // Get cursor document if provided
    let startAfterDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    if (cursor) {
      const cursorDoc = await adminDb.collection("users").doc(cursor).get();
      if (cursorDoc.exists) {
        startAfterDoc = cursorDoc;
      }
    }

    let hasMore = false;
    let lastReturnedDocId: string | null = null;
    const results: ProfileSearchResult[] = [];
    let fetchRounds = 0;

    while (
      results.length < desiredResultCount &&
      fetchRounds < MAX_FETCH_ROUNDS
    ) {
      let paginatedQuery = baseQuery.orderBy("displayName").limit(chunkSize);

      if (startAfterDoc) {
        paginatedQuery = paginatedQuery.startAfter(startAfterDoc);
      }

      const snapshot = await paginatedQuery.get();
      fetchRounds += 1;

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      startAfterDoc = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.size === chunkSize;

      for (const docSnap of snapshot.docs) {
        const userData = docSnap.data();
        if (!matchesAllFilters(userData, normalizedFilters, sanitizedQuery)) {
          continue;
        }

        const result = mapProfileResult(docSnap.id, userData);
        results.push(result);
        lastReturnedDocId = docSnap.id;

        if (results.length === desiredResultCount) {
          break;
        }
      }

      if (!hasMore) {
        break;
      }
    }

    if (results.length < desiredResultCount) {
      hasMore = false;
    }

    const effectiveResults = cursor ? results : results.slice(offset);
    const trimmedResults = effectiveResults.slice(0, normalizedLimit);
    const exposeHasMore = trimmedResults.length === normalizedLimit && hasMore;
    const nextCursor =
      exposeHasMore && lastReturnedDocId ? lastReturnedDocId : null;

    logger.info(
      {
        query: sanitizedQuery,
        filters,
        returned: trimmedResults.length,
      },
      "Profile search completed"
    );

    return NextResponse.json({
      results: trimmedResults,
      count: trimmedResults.length,
      total: trimmedResults.length,
      query: sanitizedQuery,
      filters,
      cursor: nextCursor,
      offset: cursor ? undefined : offset,
      hasMore: exposeHasMore,
    });
  } catch (error) {
    return handleApiError(error, "Search failed");
  }
}
