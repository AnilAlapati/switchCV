/**
 * Recruiter Pipeline API Route
 * POST /api/recruiter/pipeline
 * Handles pipeline operations: create, get, move candidates
 *
 * FIXED: Now persists to Firestore instead of in-memory Map
 */

import { NextRequest, NextResponse } from "next/server";
import { RecruiterPipelineActionSchema } from "@/lib/schemas/api";
import { logger } from "@/lib/logger";
import {
  verifyRecruiterRole,
  getPipeline,
  getPipelineOwner,
  initializePipeline,
  addCandidate,
  moveCandidate,
  PipelineRequest,
  InitializeRequest,
  AddCandidateRequest,
  MoveCandidateRequest,
  GetStageRequest,
} from "@/lib/services/recruiter/pipeline-service";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const { userId: authUserId, error: authError } = await getAuthenticatedUserId(
    request
  );
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const payload = await request.json();
    const action = (payload as { action?: unknown })?.action;

    if (
      action !== "initialize" &&
      action !== "add-candidate" &&
      action !== "move-candidate" &&
      action !== "get-stage"
    ) {
      return handleApiError(null, "Invalid action", 400);
    }

    const parseResult = RecruiterPipelineActionSchema.safeParse(payload);
    if (!parseResult.success) {
      if (action === "initialize") {
        return handleApiError(null, "Missing required fields: jobId and jobTitle", 400);
      }
      return handleApiError(null, "Invalid request payload", 400);
    }

    const body = parseResult.data as unknown as PipelineRequest;

    switch (body.action) {
      case "initialize": {
        const { jobId, jobTitle } = body as InitializeRequest;
        // SECURITY: Always use authUserId — ignore client-supplied recruiterId
        const pipeline = await initializePipeline(jobId, jobTitle, authUserId);

        return NextResponse.json(
          { success: true, pipeline, message: "Pipeline initialized successfully" },
          { status: 201 }
        );
      }

      case "add-candidate": {
        const { pipelineId, name, email, position, phone, resumeUrl } = body as AddCandidateRequest;

        // SECURITY: Verify pipeline ownership
        const pipelineOwner = await getPipelineOwner(pipelineId);
        if (!pipelineOwner) return handleApiError(null, "Pipeline not found", 404);
        if (pipelineOwner !== authUserId) {
          return handleApiError(null, "Forbidden: Not your pipeline", 403);
        }

        const result = await addCandidate(pipelineId, { name, email, position, phone, resumeUrl });

        if (!result) return handleApiError(null, "Pipeline not found", 404);

        return NextResponse.json(
          {
            success: true,
            candidate: result.candidate,
            totalCandidates: result.totalCandidates,
            message: "Candidate added successfully",
          },
          { status: 201 }
        );
      }

      case "move-candidate": {
        const { pipelineId, candidateId, newStage } = body as MoveCandidateRequest;

        // SECURITY: Verify pipeline ownership
        const moveOwner = await getPipelineOwner(pipelineId);
        if (!moveOwner) return handleApiError(null, "Pipeline not found", 404);
        if (moveOwner !== authUserId) {
          return handleApiError(null, "Forbidden: Not your pipeline", 403);
        }

        const candidate = await moveCandidate(pipelineId, candidateId, newStage);

        if (!candidate) return handleApiError(null, "Candidate or Pipeline not found", 404);

        return NextResponse.json(
          { success: true, candidate, message: "Candidate moved successfully" },
          { status: 200 }
        );
      }

      case "get-stage": {
        const { pipelineId, stage } = body as GetStageRequest;

        // SECURITY: Verify pipeline ownership
        const stageOwner = await getPipelineOwner(pipelineId);
        if (!stageOwner) return handleApiError(null, "Pipeline not found", 404);
        if (stageOwner !== authUserId) {
          return handleApiError(null, "Forbidden: Not your pipeline", 403);
        }

        const pipeline = await getPipeline(pipelineId);

        if (!pipeline) return handleApiError(null, "Pipeline not found", 404);

        const column = pipeline.columns.find((col) => col.stage === stage);
        const candidates = column?.candidates || [];

        return NextResponse.json(
          {
            success: true,
            stage,
            candidates,
            count: candidates.length,
          },
          { status: 200 }
        );
      }

      default:
        return handleApiError(null, "Invalid action", 400);
    }
  } catch (error) {
    logger.error({ err: error }, "Pipeline API error");
    return handleApiError(error, "Internal server error");
  }
}

export async function GET(request: NextRequest) {
  const { userId: authUserId, error: authError } = await getAuthenticatedUserId(
    request
  );
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const pipelineId = request.nextUrl.searchParams.get("id");

    if (!pipelineId) {
      return handleApiError(null, "pipelineId is required", 400);
    }

    const pipeline = await getPipeline(pipelineId);

    if (!pipeline) {
      return handleApiError(null, "Pipeline not found", 404);
    }

    // SECURITY: Verify pipeline ownership
    const getOwner = await getPipelineOwner(pipelineId);
    if (getOwner !== authUserId) {
      return handleApiError(null, "Forbidden: Not your pipeline", 403);
    }

    return NextResponse.json({
      success: true,
      pipeline,
    });
  } catch (error) {
    logger.error({ err: error }, "Pipeline GET error");
    return handleApiError(error, "Internal server error");
  }
}
