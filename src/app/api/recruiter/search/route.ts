import { NextRequest, NextResponse } from "next/server";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { RecruiterService } from "@/lib/services/recruiterService";
import { QuotaExceededError } from "@/lib/services/quotaService";

// export const dynamic = 'force-dynamic'; // Typically needed for Next.js API routes using headers/cookies

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);

    if (authError || !authUserId) {
      return authError || handleApiError(null, "Unauthorized", 401);
    }

    // 2. Parse Query
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q");

    if (!rawQuery || !rawQuery.trim()) {
      return handleApiError(null, "Search query is required", 400);
    }

    const searchQuery = rawQuery.trim();

    // 3. Delegation to Service
    try {
      const result = await RecruiterService.searchCandidates(authUserId, searchQuery);

      // 4. Response
      // Cache headers are still good to keep here at the "Edge" (Controller) level
      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=600',
        }
      });

    } catch (error: any) {
      // Handle known domain errors to preserve UX
      if (error.message === "forbidden-role") {
        return handleApiError(null, "Forbidden: Recruiter role required", 403);
      }

      if (error instanceof QuotaExceededError) {
        // We catch this here to provide specific UI feedback
        // The service could return current limit, but we can also just say "limit reached"
        // Ideally we'd get the limit from the error or service, but generic message is OK for parity
        return handleApiError(
          error,
          `You have reached your monthly search limit. Please upgrade to search more candidates.`,
          403
        );
      }

      throw error; // Let outer catch handle unexpected errors
    }

  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}

