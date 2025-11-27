import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import {
  getAuthenticatedUserId,
  handleApiError,
  attachRateLimitHeaders,
} from "@/lib/utils/api-helpers";
import { aiSearchRateLimiter } from "@/lib/utils/distributedRateLimit";

// Initialize Firebase client (required for callable functions)
import "@/lib/firebase";

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

    // Call the Cloud Function
    const functions = getFunctions(getApp(), "us-central1");
    const searchResumesAI = httpsCallable<
      { query: string; limit: number },
      SearchResponse
    >(functions, "searchResumesAI");

    const result = await searchResumesAI({ query: query.trim(), limit });

    return NextResponse.json(result.data);
  } catch (error: any) {
    logger.error({ err: error }, "[AI Search API] Error:");

    // Handle Firebase callable function errors
    if (error.code) {
      const code = error.code;
      const message = error.message || "Search failed";

      if (code === "functions/permission-denied") {
        // Check for specific error types in the message
        if (message.includes("QUOTA_EXCEEDED")) {
          return handleApiError(new Error("Quota exceeded"), message, 403);
        }
        if (message.includes("not allowed") || message.includes("tier")) {
          return handleApiError(new Error("Tier not allowed"), message, 403);
        }
        return handleApiError(new Error("Permission denied"), message, 403);
      }

      if (code === "functions/unauthenticated") {
        return handleApiError(
          new Error("Authentication required"),
          "Please sign in to use AI search",
          401
        );
      }

      if (code === "functions/invalid-argument") {
        return handleApiError(new Error(message), message, 400);
      }
    }

    return handleApiError(error, "Search failed. Please try again.");
  }
}
