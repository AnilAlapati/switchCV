import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";
import { getJobStatus } from "@/lib/services/resumeGenerationQueue";

interface RouteParams {
    params: Promise<{ jobId: string }>;
}

/**
 * GET /api/resume/generate/status/[jobId]
 *
 * Polls the status of an async resume generation job.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        // Authentication required
        const { userId, error } = await getAuthenticatedUserId(request);

        if (error) {
            logger.warn("🚨 Unauthenticated job status request");
            return error;
        }

        const { jobId } = await params;

        if (!jobId) {
            return handleApiError(
                new Error("Job ID required"),
                "Job ID is required",
                400
            );
        }

        const job = await getJobStatus(jobId, userId!);

        if (!job) {
            return handleApiError(
                new Error("Job not found"),
                "Job not found or access denied",
                404
            );
        }

        // Return appropriate response based on job status
        const response: Record<string, unknown> = {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
        };

        if (job.status === "completed" && job.result) {
            response.result = job.result;
        }

        if (job.status === "failed" && job.error) {
            response.error = job.error;
        }

        return NextResponse.json(response);
    } catch (err) {
        logger.error({ err }, "Error fetching job status");
        return handleApiError(err, "Internal server error");
    }
}
