import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { handleApiError } from "@/lib/utils/api-helpers";
import {
  buildAccessStatusMap,
  performBasicSearch,
  performPremiumSearch,
} from "./search-service";
import { FieldValue } from "firebase-admin/firestore";
import { recordRecruiterSearchEvent } from "@/lib/recruiterSearchHistory";
import { getUserTier } from "@/lib/services/userService";

interface SearchRequest {
  recruiterId: string;
  userId?: string;
  skills?: string[];
  location?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { recruiterId, userId, skills, location } = body;

    if (!recruiterId) {
      return handleApiError(null, "recruiterId is required", 400);
    }

    // Get recruiter's subscription tier (respects dev mode overrides)
    const subscriptionTier = await getUserTier(recruiterId);

    // Update recruiter metrics
    await adminDb
      .collection("recruiterMetrics")
      .doc(recruiterId)
      .set(
        {
          totalSearches: FieldValue.increment(1),
          lastActivityAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .catch((err) => console.error("Failed to update search metrics:", err));

    // Determine search type based on parameters provided
    const hasUserId = userId && userId.trim();
    const hasPremiumFilters =
      (skills && skills.length > 0) || (location && location.trim());

    // BASIC SEARCH: Search by user ID
    if (hasUserId && !hasPremiumFilters) {
      try {
        // Build access status map first to check available resumes and avoid per-resume DB calls
        const accessStatusMap = await buildAccessStatusMap(recruiterId);

        const { results, notification } = await performBasicSearch(
          userId,
          recruiterId,
          accessStatusMap
        );

        await recordRecruiterSearchEvent({
          recruiterId,
          tier: subscriptionTier,
          filters: { userId },
          resultUserIds: results.map((result) => result.userId).filter(Boolean),
          resultCount: results.length,
        });
        return NextResponse.json({
          results,
          notification:
            notification ||
            (results.length === 0 ? "No resume found" : undefined),
          tier: subscriptionTier,
          maxResults: 1,
          count: results.length,
        });
      } catch (error) {
        return handleApiError(error, "Search failed");
      }
    }

    // PREMIUM SEARCH: Search by skills and/or location (requires premium or enterprise tier)
    if (hasPremiumFilters) {
      // Check if user has permission for premium search
      if (subscriptionTier === "basic") {
        return handleApiError(
          null,
          "Premium or enterprise subscription required for skills/location search",
          403
        );
      }

      try {
        const accessStatusMap = await buildAccessStatusMap(recruiterId);
        const { results } = await performPremiumSearch(
          skills,
          location,
          recruiterId,
          accessStatusMap
        );
        await recordRecruiterSearchEvent({
          recruiterId,
          tier: subscriptionTier,
          filters: { skills, location },
          resultUserIds: results.map((result) => result.userId).filter(Boolean),
          resultCount: results.length,
        });
        return NextResponse.json({
          results,
          tier: subscriptionTier,
          count: results.length,
          totalSearched: results.length,
        });
      } catch (error) {
        return handleApiError(error, "Search failed");
      }
    }

    // No valid search parameters provided
    return handleApiError(
      null,
      "Please provide either a userId or skills/location for search",
      400
    );
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}
