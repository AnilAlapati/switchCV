import { logger } from "@/lib/logger";
// src/app/api/recruiter/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type { SearchResult } from "@/components/dashboard/RecruiterSearchForm";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { getRecruiterSearchLimits } from "@/lib/config.server";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";
import { getUserRole } from "@/lib/services/userService";
import { getConstants } from "@/lib/getSystemConfig";

type AllowedRole = "recruiter" | "admin";

const toIsoString = (value: unknown): string => {
  if (typeof value === "string" && value) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date().toISOString();
};

async function fetchUserDoc(userId: string) {
  if (!userId) return null;

  const directDoc = await adminDb.collection("users").doc(userId).get();
  if (directDoc.exists) {
    return directDoc;
  }

  const fallbackSnapshot = await adminDb
    .collection("users")
    .where("uid", "==", userId)
    .limit(1)
    .get();

  return fallbackSnapshot.docs[0] ?? null;
}

function normalizeSkills(rawSkills: any): string[] {
  if (!Array.isArray(rawSkills)) return [];
  return rawSkills
    .map((skill: any) => {
      if (typeof skill === "string") return skill;
      if (skill?.name) return String(skill.name);
      return "";
    })
    .filter(Boolean)
    .slice(0, 10);
}

function buildResult(
  resumeId: string,
  resumeData: FirebaseFirestore.DocumentData,
  userData: FirebaseFirestore.DocumentData | null
): SearchResult {
  const title = resumeData.title || "Untitled Resume";
  const skills = normalizeSkills(resumeData.skills);
  const createdAt = toIsoString(resumeData.createdAt);
  const userName = userData?.displayName || userData?.email || "Unknown User";
  const userId = resumeData.userId || userData?.uid;

  return {
    resumeId,
    title,
    userName,
    userId,
    createdAt,
    skills,
  } as SearchResult;
}

async function enforceRecruiterRole(userId: string): Promise<AllowedRole> {
  const role = await getUserRole(userId);
  if (role === "recruiter" || role === "admin") {
    return role;
  }

  throw new Error("forbidden-role");
}

export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !authUserId)
      return authError || handleApiError(null, "Unauthorized", 401);

    try {
      await enforceRecruiterRole(authUserId);
    } catch (error: any) {
      if (error.message === "forbidden-role") {
        return handleApiError(null, "Forbidden: Recruiter role required", 403);
      }
      throw error;
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q");

    if (!rawQuery) {
      return handleApiError(null, "Search query is required", 400);
    }

    const searchQuery = rawQuery.trim();

    if (!searchQuery) {
      return handleApiError(null, "Search query is required", 400);
    }

    const recruiterId = authUserId;

    const tier = await getUserTier(recruiterId!);
    const searchLimits = await getRecruiterSearchLimits();
    const limit = searchLimits[tier];

    try {
      await consumeQuota({
        subjectId: recruiterId!,
        scope: "recruiter_search",
        limit,
        period: "monthly",
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return handleApiError(
          error,
          `You have reached your monthly search limit of ${limit}. Please upgrade to search more candidates.`,
          403
        );
      }
      throw error;
    }

    const searchLower = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search in resumes collection
    try {
      const resumesSnapshot = await adminDb
        .collection("resumes")
        .where("published", "==", true)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      for (const doc of resumesSnapshot.docs) {
        const resumeData = doc.data();
        const title = resumeData.title || "Untitled Resume";
        const userId = resumeData.userId;
        const skills = resumeData.skills?.map((s: any) => s.name) || [];

        // Check if matches search query (resume number, title, or skill)
        const resumeNumber = doc.id.substring(0, 6);
        const matchesNumber = resumeNumber.includes(searchLower);
        const matchesTitle = title.toLowerCase().includes(searchLower);
        const matchesSkill = skills.some((skill: string) =>
          skill.toLowerCase().includes(searchLower)
        );

        if (!matchesNumber && !matchesTitle && !matchesSkill) {
          continue;
        }

        // Fetch user info
        try {
          const userDoc = await fetchUserDoc(userId);
          const userData = userDoc?.data?.() ?? null;
          results.push(buildResult(doc.id, resumeData, userData));
        } catch (err) {
          logger.error({ err: err }, "Error fetching user for resume:");
          results.push(buildResult(doc.id, resumeData, null));
        }
      }

      // Also search in users by name/email if no resumes found
      if (results.length === 0) {
        const usersSnapshot = await adminDb
          .collection("users")
          .where("publicProfile.visible", "==", true)
          .get();

        for (const doc of usersSnapshot.docs) {
          const userData = doc.data();
          const displayName = userData.displayName || "";
          const email = userData.email || "";

          if (
            displayName.toLowerCase().includes(searchLower) ||
            email.toLowerCase().includes(searchLower)
          ) {
            // Get user's resumes
            const userResumesSnapshot = await adminDb
              .collection("resumes")
              .where("userId", "==", doc.id)
              .where("published", "==", true)
              .get();

            for (const resumeDoc of userResumesSnapshot.docs) {
              const resumeData = resumeDoc.data();
              results.push({
                resumeId: resumeDoc.id,
                title: resumeData.title || "Untitled Resume",
                userName: displayName,
                userId: doc.id,
                createdAt: resumeData.createdAt || new Date().toISOString(),
                skills: resumeData.skills?.map((s: any) => s.name) || [],
              });
            }
          }
        }
      }

      // Remove duplicates
      const uniqueResults = Array.from(
        new Map(results.map((r) => [r.resumeId, r])).values()
      );

      const constants = await getConstants();
      return NextResponse.json({
        results: uniqueResults.slice(0, constants.AI_SEARCH.MAX_RESULTS),
        count: uniqueResults.length,
        query: searchQuery,
      });
    } catch (error) {
      return handleApiError(error, "Search failed");
    }
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}
