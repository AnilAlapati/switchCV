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

    // Get recruiter's subscription tier
    const recruiterDoc = await adminDb
      .collection("users")
      .doc(recruiterId)
      .get();

    if (!recruiterDoc.exists) {
      return handleApiError(null, "Recruiter not found", 404);
    }

    const recruiterData = recruiterDoc.data();
    const subscriptionTier = recruiterData?.subscriptionTier || "basic";

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

    // BASIC TIER: Search by user ID only, max 1 result
    if (subscriptionTier === "basic") {
      if (!userId) {
        return handleApiError(
          new Error("userId is required for basic search"),
          "userId is required for basic search",
          400
        );
      }

      try {
        const { results, notification } = await performBasicSearch(
          userId,
          recruiterId
        );

        await recordRecruiterSearchEvent({
          recruiterId,
          tier: "basic",
          filters: { userId },
          resultUserIds: results.map((result) => result.userId).filter(Boolean),
          resultCount: results.length,
        });
        return NextResponse.json({
          results,
          notification:
            notification ||
            (results.length === 0 ? "No resume found" : undefined),
          tier: "basic",
          maxResults: 1,
          count: results.length,
        });
      } catch (error) {
        return handleApiError(error, "Search failed");
      }
    }

    // PREMIUM TIER: Search by skills and/or location, multiple results
    if (subscriptionTier === "premium") {
      if (!skills && !location) {
        return handleApiError(
          null,
          "Either skills or location is required for premium search",
          400
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
          tier: "premium",
          filters: { skills, location },
          resultUserIds: results.map((result) => result.userId).filter(Boolean),
          resultCount: results.length,
        });
        return NextResponse.json({
          results,
          tier: "premium",
          count: results.length,
          totalSearched: results.length,
        });
      } catch (error) {
        return handleApiError(error, "Search failed");
      }
    }

    return handleApiError(null, "Invalid subscription tier", 400);
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}
