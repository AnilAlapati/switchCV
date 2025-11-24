// src/app/api/profiles/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  DocumentSnapshot,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  QueryConstraint,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProfileSearchResult } from "@/types/profileSearch";
import { handleApiError } from "@/lib/utils/api-helpers";
import {
  buildBaseConstraints,
  buildNormalizedFilters,
  getCursorSnapshot,
  matchesAllFilters,
  searchBySlug,
} from "./search-query";
import { mapProfileResult } from "./search-utils";

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

export async function POST(request: NextRequest) {
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
      const slugResults = await searchBySlug(normalizedFilters);
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

    const usersRef = collection(db, "users");
    const baseConstraints = buildBaseConstraints(normalizedFilters);
    const cursorSnapshot = await getCursorSnapshot(cursor);
    let startAfterDocSnapshot: DocumentSnapshot | null = cursorSnapshot;
    let hasMore = false;
    let lastReturnedDoc: QueryDocumentSnapshot | null = null;
    const results: ProfileSearchResult[] = [];
    let fetchRounds = 0;

    while (
      results.length < desiredResultCount &&
      fetchRounds < MAX_FETCH_ROUNDS
    ) {
      const constraints: QueryConstraint[] = [
        ...baseConstraints,
        orderBy("displayName"),
      ];

      if (startAfterDocSnapshot) {
        constraints.push(startAfter(startAfterDocSnapshot));
      }

      constraints.push(limit(chunkSize));

      const snapshot = await getDocs(query(usersRef, ...constraints));
      fetchRounds += 1;

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      startAfterDocSnapshot = snapshot.docs[snapshot.docs.length - 1];
      hasMore = snapshot.size === chunkSize;

      for (const docSnap of snapshot.docs) {
        const userData = docSnap.data();
        if (!matchesAllFilters(userData, normalizedFilters, sanitizedQuery)) {
          continue;
        }

        const result = mapProfileResult(docSnap.id, userData);
        results.push(result);
        lastReturnedDoc = docSnap;

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
      exposeHasMore && lastReturnedDoc ? lastReturnedDoc.id : null;

    console.log(
      `🔍 Search (query: "${sanitizedQuery}", filters: ${JSON.stringify(
        filters
      )}) returned ${trimmedResults.length} results`
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
