import { adminDb } from "@/lib/firebase-admin";
import type { ProfileSearchResult } from "@/types/profileSearch";
import { mapProfileResult } from "@/app/api/profiles/search/search-utils";

export interface NormalizedFilters {
  role?: string;
  location?: string;
  skills: string[];
  slug?: string;
}

export async function searchProfilesBySlug(
  slug: string
): Promise<ProfileSearchResult[]> {
  const snapshot = await adminDb
    .collection("users")
    .where("publicProfile.visible", "==", true)
    .where("profileSlug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((docSnap) =>
    mapProfileResult(docSnap.id, docSnap.data())
  );
}

export async function getProfileCursorSnapshot(cursorId: string) {
  const cursorDoc = await adminDb.collection("users").doc(cursorId).get();
  if (!cursorDoc.exists) {
    return null;
  }
  return cursorDoc;
}

/**
 * Builds a query for profile search based on filters.
 * Note: This returns an Admin SDK Query object.
 */
export function buildProfileSearchQuery(filters: NormalizedFilters) {
  let baseQuery = adminDb
    .collection("users")
    .where("publicProfile.visible", "==", true);

  if (filters.role) {
    baseQuery = baseQuery.where("publicProfile.role", "==", filters.role);
  }

  if (filters.location) {
    baseQuery = baseQuery.where(
      "publicProfile.location",
      "==",
      filters.location
    );
  }

  if (filters.slug) {
    baseQuery = baseQuery.where("profileSlug", "==", filters.slug);
  }

  if (filters.skills.length === 1) {
    baseQuery = baseQuery.where(
      "publicProfile.skills",
      "array-contains",
      filters.skills[0]
    );
  } else if (filters.skills.length > 1) {
    baseQuery = baseQuery.where(
      "publicProfile.skills",
      "array-contains-any",
      filters.skills.slice(0, 10)
    );
  }

  return baseQuery;
}
