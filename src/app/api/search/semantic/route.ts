import { NextRequest, NextResponse } from "next/server";
import { performSemanticSearch } from "@/lib/services/semanticSearchService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import {
  containsPromptInjection,
  sanitizeForPrompt,
} from "@/lib/utils/promptSafety";

// Security constants
const MAX_QUERY_LENGTH = 500;
const MIN_QUERY_LENGTH = 3;

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const { error: authError } = await getAuthenticatedUserId(req);
    if (authError) return authError;

    // 2. Parse and validate query
    const body = await req.json().catch(() => ({}));
    const { query } = body;

    if (!query || typeof query !== "string") {
      return handleApiError(null, "Query string is required", 400, req);
    }

    // 3. Security: Query length validation
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      return handleApiError(
        null,
        `Query must be at least ${MIN_QUERY_LENGTH} characters`,
        400,
        req
      );
    }
    if (trimmedQuery.length > MAX_QUERY_LENGTH) {
      return handleApiError(
        null,
        `Query must be at most ${MAX_QUERY_LENGTH} characters`,
        400,
        req
      );
    }

    // 4. Security: Prompt injection detection
    if (containsPromptInjection(trimmedQuery)) {
      logger.warn(
        { query: trimmedQuery.slice(0, 50) },
        "Prompt injection attempt detected in semantic search"
      );
      return handleApiError(null, "Invalid query content", 400, req);
    }

    // 5. Security: Sanitize query before embedding generation
    const sanitizedQuery = sanitizeForPrompt(trimmedQuery, MAX_QUERY_LENGTH);

    // 6. Execute Semantic Search via Service
    const results = await performSemanticSearch(sanitizedQuery, 5);

    return NextResponse.json({
      results,
      count: results.length,
    });
  } catch (error) {
    return handleApiError(error, "Semantic search failed", 500, req);
  }
}
