import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
    handleApiError,
    getAuthenticatedUserId,
    applyRateLimit,
} from "@/lib/utils/api-helpers";
import { searchByJobDescription } from "@/lib/services/smartSearchService";
import { QuotaExceededError } from "@/lib/services/quotaService";
import { logger } from "@/lib/logger";

/**
 * Request schema for JD-based search
 */
const JDSearchRequestSchema = z.object({
    jdText: z.string()
        .min(50, "Job description must be at least 50 characters")
        .max(10000, "Job description is too long (max 10,000 characters)"),
    limit: z.number().min(1).max(100).optional().default(50),
    useAI: z.boolean().optional().default(true),
});

export type JDSearchRequest = z.infer<typeof JDSearchRequestSchema>;

/**
 * POST /api/recruiter/jd-search
 *
 * Search for candidates by uploading a job description.
 * The JD is parsed to extract requirements, then matching candidates are returned.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();

    try {
        // 1. Authentication
        const { userId: authUserId, error: authError } =
            await getAuthenticatedUserId(request);

        if (authError !== undefined || authUserId === undefined) {
            return authError || handleApiError(null, "Unauthorized", 401);
        }

        // 2. Rate limiting - 5 JD searches per hour per user (AI-intensive operation)
        const rateLimitResult = await applyRateLimit(`jd-search:${authUserId}`, {
            limit: 5,
            windowMs: 60 * 60 * 1000, // 1 hour
        });

        if (!rateLimitResult.allowed) {
            logger.warn(
                { recruiterId: authUserId },
                "JD search rate limit exceeded"
            );
            return rateLimitResult.response;
        }

        // 3. Parse and validate request body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return handleApiError(null, "Invalid JSON body", 400);
        }

        const parseResult = JDSearchRequestSchema.safeParse(body);
        if (!parseResult.success) {
            return handleApiError(parseResult.error, "Invalid input", 400);
        }

        const { jdText, limit, useAI } = parseResult.data;

        logger.info(
            { recruiterId: authUserId, jdLength: jdText.length, useAI },
            "JD search request received"
        );

        // 3. Perform JD-based search
        try {
            const result = await searchByJobDescription({
                jdText,
                recruiterId: authUserId,
                limit,
                useAI,
            });

            const responseTime = Date.now() - startTime;

            logger.info(
                {
                    recruiterId: authUserId,
                    resultCount: result.results.length,
                    parsedTitle: result.parsedJD.title,
                    searchTimeMs: result.searchTimeMs,
                    responseTimeMs: responseTime,
                },
                "JD search completed"
            );

            // 4. Return response with cache headers
            return NextResponse.json(
                {
                    success: true,
                    results: result.results,
                    parsedJD: result.parsedJD,
                    generatedQuery: result.generatedQuery,
                    searchType: result.searchType,
                    fromCache: result.fromCache,
                    searchTimeMs: result.searchTimeMs,
                    totalScanned: result.totalScanned,
                },
                {
                    headers: {
                        "Cache-Control": "private, max-age=60, stale-while-revalidate=600",
                    },
                }
            );
        } catch (error) {
            // Handle known domain errors
            const errorText = String(error);
            if (errorText.includes("forbidden-role")) {
                return handleApiError(null, "Forbidden: Recruiter role required", 403);
            }

            if (error instanceof QuotaExceededError) {
                return handleApiError(
                    error,
                    "You have reached your monthly search limit. Please upgrade to search more candidates.",
                    403
                );
            }

            throw error; // Let outer catch handle unexpected errors
        }
    } catch (error: unknown) {
        logger.error({ err: error }, "JD search failed");
        return handleApiError(error, "Failed to search by JD");
    }
}
