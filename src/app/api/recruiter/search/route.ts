// src/app/api/recruiter/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import type { SearchResult } from "@/components/dashboard/RecruiterSearchForm";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { RECRUITER_SEARCH_LIMITS } from "@/lib/config";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q");

    if (!rawQuery) {
      return handleApiError(null, "Search query is required", 400);
    }

    const searchQuery = rawQuery.trim();

    if (!searchQuery) {
      return handleApiError(null, "Search query is required", 400);
    }

    const { userId: recruiterId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const tier = await getUserTier(recruiterId!);
    const limit = RECRUITER_SEARCH_LIMITS[tier];

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
      const resumesRef = collection(db, "resumes");
      const resumesQuery = query(
        resumesRef,
        where("published", "==", true),
        orderBy("createdAt", "desc"),
        firestoreLimit(50)
      );

      const resumesSnapshot = await getDocs(resumesQuery);

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
          const userDoc = await getDocs(
            query(collection(db, "users"), where("uid", "==", userId))
          );
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            results.push({
              resumeId: doc.id,
              title,
              userName: userData.displayName || userData.email || "Anonymous",
              userId,
              createdAt: resumeData.createdAt || new Date().toISOString(),
              skills: skills.slice(0, 10),
            });
          }
        } catch (err) {
          console.error("Error fetching user for resume:", err);
          // Continue with just resume data if user fetch fails
          results.push({
            resumeId: doc.id,
            title,
            userName: "Unknown User",
            userId,
            createdAt: resumeData.createdAt || new Date().toISOString(),
            skills: skills.slice(0, 10),
          });
        }
      }

      // Also search in users by name/email if no resumes found
      if (results.length === 0) {
        const usersRef = collection(db, "users");
        const usersQuery = query(
          usersRef,
          where("publicProfile.visible", "==", true)
        );
        const usersSnapshot = await getDocs(usersQuery);

        for (const doc of usersSnapshot.docs) {
          const userData = doc.data();
          const displayName = userData.displayName || "";
          const email = userData.email || "";

          if (
            displayName.toLowerCase().includes(searchLower) ||
            email.toLowerCase().includes(searchLower)
          ) {
            // Get user's resumes
            const userResumesQuery = query(
              collection(db, "resumes"),
              where("userId", "==", doc.id),
              where("published", "==", true)
            );
            const userResumesSnapshot = await getDocs(userResumesQuery);

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

      return NextResponse.json({
        results: uniqueResults.slice(0, 20),
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
