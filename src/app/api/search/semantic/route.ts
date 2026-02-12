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
import { aiRateLimiter } from "@/lib/utils/rateLimit";
import { z } from "zod";

// Security constants
const MAX_QUERY_LENGTH = 500;
const MIN_QUERY_LENGTH = 3;

const SemanticSearchSchema = z.object({
  query: z.string().min(MIN_QUERY_LENGTH).max(MAX_QUERY_LENGTH).trim(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const { userId, error: authError } = await getAuthenticatedUserId(req);
    if (authError) return authError;

    // 1b. Rate limiting (AI-powered search)
    if (userId) {
      const rateLimitResult = await aiRateLimiter(userId);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429 }
        );
      }
    }

    // 2. Parse and validate query with Zod (CODING_STANDARDS §9.2)
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return handleApiError(null, "Invalid JSON body", 400, req);
    }
    const parseResult = SemanticSearchSchema.safeParse(body);
    if (!parseResult.success) {
      return handleApiError(null, "Query string is required", 400, req);
    }

    // 3. Security: Query validated via Zod schema
    const trimmedQuery = parseResult.data.query;

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
