/**
 * Recruiter Pipeline API Route
 * POST /api/recruiter/pipeline
 * Handles pipeline operations: create, get, move candidates
 */

import { NextRequest, NextResponse } from "next/server";
import {
  RecruitmentPipeline,
  PipelineStage,
} from "@/lib/recruiterDashboard.types";
import { createCandidate, getCandidatesByStage } from "@/lib/recruiterPipeline";
import {
  initializePipeline,
  addCandidateToPipeline,
  moveCandidateInPipeline,
} from "@/lib/recruiterPipelineHelpers";

interface InitializeRequest {
  action: "initialize";
  jobId: string;
  jobTitle: string;
}

interface AddCandidateRequest {
  action: "add-candidate";
  pipelineId: string;
  name: string;
  email: string;
  position: string;
  phone?: string;
  resumeUrl?: string;
}

interface MoveCandidateRequest {
  action: "move-candidate";
  pipelineId: string;
  candidateId: string;
  newStage: PipelineStage;
}

interface GetStageRequest {
  action: "get-stage";
  pipelineId: string;
  stage: PipelineStage;
}

type PipelineRequest =
  | InitializeRequest
  | AddCandidateRequest
  | MoveCandidateRequest
  | GetStageRequest;

// In-memory storage (replace with database in production)
export const pipelines = new Map<string, RecruitmentPipeline>();

export async function POST(request: NextRequest) {
  try {
    const body: PipelineRequest = await request.json();

    switch (body.action) {
      case "initialize": {
        const { jobId, jobTitle } = body as InitializeRequest;
        if (!jobId || !jobTitle) {
          return NextResponse.json(
            { error: "Missing required fields: jobId and jobTitle" },
            { status: 400 }
          );
        }
        const pipeline = initializePipeline(jobId, jobTitle);
        pipelines.set(pipeline.id, pipeline);

        return NextResponse.json(
          {
            success: true,
            pipeline,
            message: "Pipeline initialized successfully",
          },
          { status: 201 }
        );
      }

      case "add-candidate": {
        const { pipelineId, name, email, position, phone, resumeUrl } =
          body as AddCandidateRequest;
        const pipeline = pipelines.get(pipelineId);

        if (!pipeline) {
          return NextResponse.json(
            { error: "Pipeline not found" },
            { status: 404 }
          );
        }

        const candidate = createCandidate(
          name,
          email,
          position,
          phone,
          resumeUrl
        );
        const updated = addCandidateToPipeline(pipeline, candidate);
        pipelines.set(pipelineId, updated);

        return NextResponse.json(
          {
            success: true,
            candidate,
            totalCandidates: updated.totalCandidates,
            message: "Candidate added successfully",
          },
          { status: 201 }
        );
      }

      case "move-candidate": {
        const { pipelineId, candidateId, newStage } =
          body as MoveCandidateRequest;
        const pipeline = pipelines.get(pipelineId);

        if (!pipeline) {
          return NextResponse.json(
            { error: "Pipeline not found" },
            { status: 404 }
          );
        }

        const candidate = pipeline.columns
          .flatMap((col) => col.candidates)
          .find((c) => c.id === candidateId);

        if (!candidate) {
          return NextResponse.json(
            { error: "Candidate not found" },
            { status: 404 }
          );
        }

        const updated = moveCandidateInPipeline(pipeline, candidate, newStage);
        pipelines.set(pipelineId, updated);

        return NextResponse.json(
          {
            success: true,
            candidate: { ...candidate, stage: newStage },
            message: "Candidate moved successfully",
          },
          { status: 200 }
        );
      }

      case "get-stage": {
        const { pipelineId, stage } = body as GetStageRequest;
        const pipeline = pipelines.get(pipelineId);

        if (!pipeline) {
          return NextResponse.json(
            { error: "Pipeline not found" },
            { status: 404 }
          );
        }

        const candidates = getCandidatesByStage(pipeline, stage);

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
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Pipeline API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
