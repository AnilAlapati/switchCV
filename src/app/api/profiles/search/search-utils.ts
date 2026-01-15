import type { ProfileSearchResult } from "@/types/profileSearch";

export interface NormalizedFilters {
  role?: string;
  location?: string;
  skills: string[];
  slug?: string;
}

export function normalizeSkills(skills?: string[]): string[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => skill?.toString().trim())
    .filter((skill): skill is string => Boolean(skill));
}

export function includesAllSkills(
  targetSkills: string[] = [],
  requiredSkills: string[] = []
): boolean {
  if (!requiredSkills || requiredSkills.length === 0) return true;
  return requiredSkills.every((skill) =>
    targetSkills.some((ts) => ts.toLowerCase().includes(skill.toLowerCase()))
  );
}

export function matchesQuery(text: string = "", query: string = ""): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function extractProfileSkills(userData: Record<string, unknown>): string[] {
  const publicProfile = userData.publicProfile as Record<string, unknown> | undefined;
  const skills = publicProfile?.skills;
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => {
      if (typeof skill === "string") return skill;
      const s = skill as { name?: string };
      if (s?.name) return String(s.name);
      return "";
    })
    .filter(Boolean);
}

export function mapProfileResult(
  userId: string,
  userData: Record<string, unknown>
): ProfileSearchResult {
  const publicProfile = userData.publicProfile as Record<string, unknown> | undefined;
  const displayName = (userData.displayName as string) || "";
  const username = (publicProfile?.username as string) || "";
  const bio = (publicProfile?.aiSelectedBio as string) || "";
  const role = (publicProfile?.role as string) || "";
  const location = (publicProfile?.location as string) || "";
  const skills = extractProfileSkills(userData);

  return {
    userId,
    username,
    displayName,
    photoURL: userData.photoURL as string | undefined,
    bio,
    role: role || undefined,
    location: location || undefined,
    skills: skills.length > 0 ? skills : undefined,
    hasApproval: false,
    approvalExpiresAt: undefined,
  };
}

export function matchesAllFilters(
  userData: Record<string, unknown>,
  normalizedFilters: NormalizedFilters,
  searchQuery?: string
): boolean {
  const publicProfile = userData.publicProfile as Record<string, unknown> | undefined;
  const displayName = (userData.displayName as string) || "";
  const username = (publicProfile?.username as string) || "";
  const slug = (userData.profileSlug as string) || "";
  const bio = (publicProfile?.aiSelectedBio as string) || "";
  const role = (publicProfile?.role as string) || "";
  const location = (publicProfile?.location as string) || "";
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

export function buildNormalizedFilters(
  filters?: Record<string, unknown>
): NormalizedFilters {
  return {
    role: (filters?.role as string)?.trim() || undefined,
    location: (filters?.location as string)?.trim() || undefined,
    skills: normalizeSkills(filters?.skills as string[]).slice(0, 10),
    slug: (filters?.slug as string)?.trim() || undefined,
  };
}
