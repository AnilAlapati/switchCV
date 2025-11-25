import type { ProfileSearchResult } from "@/types/profileSearch";

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

export function extractProfileSkills(userData: Record<string, any>): string[] {
  const skills = userData.publicProfile?.skills;
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill: any) => {
      if (typeof skill === "string") return skill;
      if (skill?.name) return String(skill.name);
      return "";
    })
    .filter(Boolean);
}

export function mapProfileResult(
  userId: string,
  userData: Record<string, any>
): ProfileSearchResult {
  const displayName = userData.displayName || "";
  const username = userData.publicProfile?.username || "";
  const bio = userData.publicProfile?.aiSelectedBio || "";
  const role = userData.publicProfile?.role || "";
  const location = userData.publicProfile?.location || "";
  const skills = extractProfileSkills(userData);

  return {
    userId,
    username,
    displayName,
    photoURL: userData.photoURL,
    bio,
    role: role || undefined,
    location: location || undefined,
    skills: skills.length > 0 ? skills : undefined,
    hasApproval: false,
    approvalExpiresAt: undefined,
  };
}
