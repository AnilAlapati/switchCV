import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
  attachRateLimitHeaders,
} from "@/lib/utils/api-helpers";
import { aiSearchRateLimiter } from "@/lib/utils/distributedRateLimit";

const REGION = "us-central1";

interface SearchRequest {
  query: string;
  limit?: number;
}

interface SearchResult {
  resumeId: number;
  userId: string;
  score: number;
  title: string;
  skills: string[];
  matchReason?: string;
}

interface SearchResponse {
  results: SearchResult[];
  totalResults: number;
  quotaRemaining: number;
  quotaLimit: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
    }

    if (!userId) {
      return handleApiError(
        new Error("Authentication required"),
        "Please sign in to use AI search",
        401
      );
    }

    // Apply distributed rate limiting (works across serverless instances)
    const rateLimitResult = await aiSearchRateLimiter(userId);
    if (!rateLimitResult.allowed) {
      const response = handleApiError(
        new Error("Rate limit exceeded"),
        "Too many requests. Please wait before searching again.",
        429
      );
      attachRateLimitHeaders(response, rateLimitResult);
      return response;
    }

    // Parse request body
    const body: SearchRequest = await request.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== "string") {
      return handleApiError(
        new Error("Invalid query"),
        "Search query is required",
        400
      );
    }

    if (query.trim().length < 10) {
      return handleApiError(
        new Error("Query too short"),
        "Please enter a more detailed search query (at least 10 characters)",
        400
      );
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
    }

    const functionUrl = `https://${REGION}-${projectId}.cloudfunctions.net/searchResumesAI`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("authorization") || "",
      },
      body: JSON.stringify({ data: { query: query.trim(), limit } }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        payload?.error?.message || payload?.error || "Search failed";
      const status = response.status;

      if (status === 403) {
        if (errorMessage.includes("QUOTA_EXCEEDED")) {
          return handleApiError(new Error("Quota exceeded"), "Search quota exceeded", 403);
        }
        if (
          errorMessage.includes("not allowed") ||
          errorMessage.includes("tier")
        ) {
          return handleApiError(
            new Error("Tier not allowed"),
            "AI search not available for your subscription tier",
            403
          );
        }
        return handleApiError(
          new Error("Permission denied"),
          "Permission denied for AI search",
          403
        );
      }

      if (status === 401) {
        return handleApiError(
          new Error("Authentication required"),
          "Please sign in to use AI search",
          401
        );
      }

      if (status === 400) {
        return handleApiError(new Error(errorMessage), "Invalid search request", 400);
      }

      return handleApiError(
        new Error(errorMessage),
        "Search service error",
        status || 500
      );
    }

    const resultData = payload?.result ?? payload?.data ?? payload;
    if (!resultData) {
      throw new Error("Invalid response from search function");
    }

    return NextResponse.json(resultData as SearchResponse);
  } catch (error: unknown) {
    logger.error({ err: error }, "[AI Search API] Error:");

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as { code?: string })?.code;

    // Handle Firebase callable function errors
    if (errorCode) {
      if (errorCode === "functions/permission-denied") {
        // Check for specific error types in the message
        if (errorMessage.includes("QUOTA_EXCEEDED")) {
          return handleApiError(new Error("Quota exceeded"), "Search quota exceeded", 403);
        }
        if (errorMessage.includes("not allowed") || errorMessage.includes("tier")) {
          return handleApiError(new Error("Tier not allowed"), "AI search not available for your subscription tier", 403);
        }
        return handleApiError(new Error("Permission denied"), "Permission denied for AI search", 403);
      }

      if (errorCode === "functions/unauthenticated") {
        return handleApiError(
          new Error("Authentication required"),
          "Please sign in to use AI search",
          401
        );
      }

      if (errorCode === "functions/invalid-argument") {
        return handleApiError(new Error(errorMessage), "Invalid search request", 400);
      }
    }

    return handleApiError(error, "Search failed. Please try again: " + errorMessage);
  }
}
