import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ProfileSearchResult } from "@/types/profileSearch";
import {
  includesAllSkills,
  mapProfileResult,
  matchesQuery,
  normalizeSkills,
  extractProfileSkills,
} from "./search-utils";

export interface NormalizedFilters {
  role?: string;
  location?: string;
  skills: string[];
  slug?: string;
}

export function buildBaseConstraints(
  normalizedFilters: NormalizedFilters
): QueryConstraint[] {
  const constraints: QueryConstraint[] = [
    where("publicProfile.visible", "==", true),
  ];

  if (normalizedFilters.role) {
    constraints.push(where("publicProfile.role", "==", normalizedFilters.role));
  }

  if (normalizedFilters.location) {
    constraints.push(
      where("publicProfile.location", "==", normalizedFilters.location)
    );
  }

  if (normalizedFilters.slug) {
    constraints.push(where("profileSlug", "==", normalizedFilters.slug));
  }

  if (normalizedFilters.skills.length === 1) {
    constraints.push(
      where(
        "publicProfile.skills",
        "array-contains",
        normalizedFilters.skills[0]
      )
    );
  } else if (normalizedFilters.skills.length > 1) {
    constraints.push(
      where(
        "publicProfile.skills",
        "array-contains-any",
        normalizedFilters.skills.slice(0, 10)
      )
    );
  }

  return constraints;
}

export async function getCursorSnapshot(cursorId?: string) {
  if (!cursorId) {
    return null;
  }

  const cursorRef = doc(db, "users", cursorId);
  const cursorSnapshot = await getDoc(cursorRef);
  if (!cursorSnapshot.exists()) {
    return null;
  }

  return cursorSnapshot;
}

export function matchesAllFilters(
  userData: Record<string, any>,
  normalizedFilters: NormalizedFilters,
  searchQuery?: string
): boolean {
  const displayName = userData.displayName || "";
  const username = userData.publicProfile?.username || "";
  const slug = userData.profileSlug || "";
  const bio = userData.publicProfile?.aiSelectedBio || "";
  const role = userData.publicProfile?.role || "";
  const location = userData.publicProfile?.location || "";
  const skills = extractProfileSkills(userData);

  const matchesSearch =
    !searchQuery ||
    matchesQuery(displayName, searchQuery) ||
    matchesQuery(username, searchQuery) ||
    matchesQuery(bio, searchQuery) ||
    matchesQuery(role, searchQuery);

  const matchesRole =
    !normalizedFilters.role ||
    role.toLowerCase() === normalizedFilters.role.toLowerCase();

  const matchesLocation =
    !normalizedFilters.location ||
    location.toLowerCase().includes(normalizedFilters.location.toLowerCase());

  const matchesSkills = includesAllSkills(skills, normalizedFilters.skills);

  const matchesSlug =
    !normalizedFilters.slug || slug === normalizedFilters.slug;

  return (
    matchesSearch &&
    matchesRole &&
    matchesLocation &&
    matchesSkills &&
    matchesSlug
  );
}

export async function searchBySlug(
  normalizedFilters: NormalizedFilters
): Promise<ProfileSearchResult[]> {
  if (!normalizedFilters.slug) {
    return [];
  }

  const usersRef = collection(db, "users");
  const slugQuery = query(
    usersRef,
    where("publicProfile.visible", "==", true),
    where("profileSlug", "==", normalizedFilters.slug),
    limit(1)
  );

  const snapshot = await getDocs(slugQuery);
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map((docSnap) =>
    mapProfileResult(docSnap.id, docSnap.data())
  );
}

export function buildNormalizedFilters(filters?: Record<string, any>) {
  return {
    role: filters?.role?.trim() || undefined,
    location: filters?.location?.trim() || undefined,
    skills: normalizeSkills(filters?.skills).slice(0, 10),
    slug: filters?.slug?.trim() || undefined,
  } satisfies NormalizedFilters;
}
