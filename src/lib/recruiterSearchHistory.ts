import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";

const DAY_IN_MS = 86_400_000;
const DEFAULT_EVENT_LIMIT = 500;

interface SearchHistoryFilters {
  userId?: string | null;
  skills?: string[] | null;
  location?: string | null;
}

export interface RecruiterSearchEventPayload {
  recruiterId: string;
  tier: "basic" | "premium";
  filters?: SearchHistoryFilters;
  resultUserIds?: string[];
  resultCount?: number;
}

export interface SearchBreakdownEntry {
  name: string;
  count: number;
}

export interface RecruiterSearchBreakdown {
  searchesLast24h: number;
  searchesLast7Days: number;
  uniqueCandidatesLast7Days: number;
  topSkillsLast7Days: SearchBreakdownEntry[];
  topLocationsLast7Days: SearchBreakdownEntry[];
}

interface SearchHistoryDoc {
  recruiterId: string;
  tier: "basic" | "premium";
  filters?: {
    userId?: string | null;
    skills?: string[];
    location?: string | null;
  };
  resultUserIds?: string[];
  resultCount?: number;
  createdAt?: Timestamp | Date | string | null;
}

export const DEFAULT_SEARCH_BREAKDOWN: RecruiterSearchBreakdown = {
  searchesLast24h: 0,
  searchesLast7Days: 0,
  uniqueCandidatesLast7Days: 0,
  topSkillsLast7Days: [],
  topLocationsLast7Days: [],
};

function normaliseList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim().toLowerCase();
    if (trimmed) {
      seen.add(trimmed);
    }
  }

  return Array.from(seen.values());
}

function normaliseLocation(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function parseTimestamp(value?: Timestamp | Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof (value as any).toDate === "function") {
    const date = (value as any).toDate();
    return date instanceof Date ? date.getTime() : null;
  }
  return null;
}

function buildTopList(
  map: Map<string, number>,
  limit = 3
): SearchBreakdownEntry[] {
  return Array.from(map.entries())
    .filter(([name]) => Boolean(name))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export async function recordRecruiterSearchEvent(
  payload: RecruiterSearchEventPayload
) {
  const normalisedSkills = normaliseList(payload.filters?.skills);
  const normalisedLocation = normaliseLocation(payload.filters?.location);
  const uniqueResultUserIds = Array.from(
    new Set((payload.resultUserIds ?? []).filter(Boolean))
  );

  try {
    await adminDb.collection("recruiterSearchHistory").add({
      recruiterId: payload.recruiterId,
      tier: payload.tier,
      filters: {
        userId: payload.filters?.userId ?? null,
        skills: normalisedSkills,
        location: normalisedLocation,
      },
      resultCount: payload.resultCount ?? uniqueResultUserIds.length,
      resultUserIds: uniqueResultUserIds,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error(
      { err: error },
      "[RecruiterSearchHistory] Failed to record search"
    );
  }
}

export async function getRecruiterSearchBreakdown(
  recruiterId: string,
  options?: { windowDays?: number; eventLimit?: number }
): Promise<RecruiterSearchBreakdown> {
  if (!recruiterId) {
    return { ...DEFAULT_SEARCH_BREAKDOWN };
  }

  const windowDays = options?.windowDays ?? 30;
  const eventLimit = options?.eventLimit ?? DEFAULT_EVENT_LIMIT;
  const windowStart = new Date(Date.now() - windowDays * DAY_IN_MS);

  try {
    const snapshot = await adminDb
      .collection("recruiterSearchHistory")
      .where("recruiterId", "==", recruiterId)
      .where("createdAt", ">=", windowStart)
      .orderBy("createdAt", "desc")
      .limit(eventLimit)
      .get();

    if (snapshot.empty) {
      return { ...DEFAULT_SEARCH_BREAKDOWN };
    }

    let searchesLast24h = 0;
    let searchesLast7Days = 0;
    const uniqueCandidates = new Set<string>();
    const skillCounts = new Map<string, number>();
    const locationCounts = new Map<string, number>();

    const last24hThreshold = Date.now() - DAY_IN_MS;
    const last7DaysThreshold = Date.now() - 7 * DAY_IN_MS;

    snapshot.forEach((doc) => {
      const data = doc.data() as SearchHistoryDoc;
      const createdAtMs = parseTimestamp(data.createdAt);
      if (!createdAtMs) {
        return;
      }

      if (createdAtMs >= last7DaysThreshold) {
        searchesLast7Days++;
        (data.resultUserIds ?? []).forEach((candidateId) => {
          if (typeof candidateId === "string" && candidateId.trim()) {
            uniqueCandidates.add(candidateId);
          }
        });

        normaliseList(data.filters?.skills).forEach((skill) => {
          const next = (skillCounts.get(skill) ?? 0) + 1;
          skillCounts.set(skill, next);
        });

        const location = normaliseLocation(data.filters?.location);
        if (location) {
          const next = (locationCounts.get(location) ?? 0) + 1;
          locationCounts.set(location, next);
        }
      }

      if (createdAtMs >= last24hThreshold) {
        searchesLast24h++;
      }
    });

    return {
      searchesLast24h,
      searchesLast7Days,
      uniqueCandidatesLast7Days: uniqueCandidates.size,
      topSkillsLast7Days: buildTopList(skillCounts),
      topLocationsLast7Days: buildTopList(locationCounts),
    };
  } catch (error) {
    logger.error(
      { err: error },
      "[RecruiterSearchHistory] Failed to build breakdown"
    );
    return { ...DEFAULT_SEARCH_BREAKDOWN };
  }
}
