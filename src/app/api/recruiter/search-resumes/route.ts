import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  attachRateLimitHeaders,
  getAuthenticatedUserId,
  getClientIp,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  buildAccessStatusMap,
  performBasicSearch,
  performPremiumSearch,
} from "./search-service";
import { FieldValue } from "firebase-admin/firestore";
import { recordRecruiterSearchEvent } from "@/lib/recruiterSearchHistory";
import { getUserRole, getUserTier } from "@/lib/services/userService";
import { getConstants } from "@/lib/getSystemConfig";
import { logger } from "@/lib/logger";
import { searchResumesSchema } from "@/lib/validations/recruiter";
import { createDistributedRateLimiter } from "@/lib/utils/distributedRateLimit";

const getRecruiterSearchRateLimiter = async () => {
  const constants = await getConstants();
  return createDistributedRateLimiter("recruiter-search", {
    limit: constants.RATE_LIMITS.SEARCH_REQUESTS_PER_MINUTE,
    windowMs: 60 * 1000,
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = searchResumesSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(
        new Error("Invalid search parameters"),
        "Invalid search parameters: " +
          validationResult.error.issues.map((e) => e.message).join(", "),
        400
      );
    }
    const {
      userId,
      skills,
      location,
      recruiterId: requestedRecruiterId,
    } = validationResult.data;

    const { userId: authenticatedUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !authenticatedUserId) {
      return authError ?? handleApiError(null, "Unauthorized", 401);
    }

    const requesterRole = await getUserRole(authenticatedUserId);
    const isAdmin = requesterRole === "admin";
    if (!isAdmin && requesterRole !== "recruiter") {
      return handleApiError(null, "Recruiter access required", 403);
    }

    const recruiterId = requestedRecruiterId || authenticatedUserId;

    if (!isAdmin && recruiterId !== authenticatedUserId) {
      return handleApiError(null, "Forbidden: Recruiter mismatch", 403);
    }

    const rateIdentifier = `${authenticatedUserId}:${getClientIp(request)}`;
    const recruiterSearchRateLimiter = await getRecruiterSearchRateLimiter();
    const rateLimitResult = await recruiterSearchRateLimiter(rateIdentifier);
    if (!rateLimitResult.allowed) {
      const response = handleApiError(
        new Error("Rate limit exceeded"),
        "Too many requests. Please wait before searching again.",
        429
      );
      attachRateLimitHeaders(response, rateLimitResult);
      return response;
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
      .catch((err) =>
        logger.error({ err: err }, "Failed to update search metrics:")
      );

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
        const response = NextResponse.json({
          results,
          notification:
            notification ||
            (results.length === 0 ? "No resume found" : undefined),
          tier: subscriptionTier,
          maxResults: 1,
          count: results.length,
        });
        attachRateLimitHeaders(response, rateLimitResult);
        return response;
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
        const response = NextResponse.json({
          results,
          tier: subscriptionTier,
          count: results.length,
          totalSearched: results.length,
        });
        attachRateLimitHeaders(response, rateLimitResult);
        return response;
      } catch (error) {
        return handleApiError(error, "Search failed");
      }
    }

    // No valid search parameters provided
    const response = handleApiError(
      null,
      "Please provide either a userId or skills/location for search",
      400
    );
    attachRateLimitHeaders(response, rateLimitResult);
    return response;
  } catch (error) {
    logger.error({ err: error }, "Recruiter search request failed");
    return handleApiError(error, "Failed to process request");
  }
}
