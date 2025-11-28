/**
 * Recruiter Pipeline API Route
 * POST /api/recruiter/pipeline
 * Handles pipeline operations: create, get, move candidates
 *
 * FIXED: Now persists to Firestore instead of in-memory Map
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  RecruitmentPipeline,
  PipelineStage,
  Candidate,
  PipelineColumn,
} from "@/lib/recruiterDashboard.types";
import { createCandidate } from "@/lib/recruiterPipeline";
import { generatePipelineId } from "@/lib/recruiterPipelineHelpers";
import { handleApiError } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

interface InitializeRequest {
  action: "initialize";
  jobId: string;
  jobTitle: string;
  recruiterId: string;
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

const PIPELINES_COLLECTION = "recruiterPipelines";
const CANDIDATES_SUBCOLLECTION = "candidates";

/**
 * Get pipeline from Firestore
 */
async function getPipeline(
  pipelineId: string
): Promise<RecruitmentPipeline | null> {
  const pipelineDoc = await adminDb
    .collection(PIPELINES_COLLECTION)
    .doc(pipelineId)
    .get();

  if (!pipelineDoc.exists) {
    return null;
  }

  const data = pipelineDoc.data();

  // Fetch candidates from subcollection
  const candidatesSnap = await adminDb
    .collection(PIPELINES_COLLECTION)
    .doc(pipelineId)
    .collection(CANDIDATES_SUBCOLLECTION)
    .get();

  const candidates: Candidate[] = candidatesSnap.docs.map((doc) => {
    const c = doc.data();
    return {
      ...c,
      id: doc.id,
      createdAt: c.createdAt?.toDate() || new Date(),
      updatedAt: c.updatedAt?.toDate() || new Date(),
      appliedDate: c.appliedDate?.toDate(),
    } as Candidate;
  });

  // Build columns from candidates
  const stages: PipelineStage[] = [
    PipelineStage.LEAD,
    PipelineStage.SCREENED,
    PipelineStage.SHORTLISTED,
    PipelineStage.INTERVIEWED,
    PipelineStage.OFFERED,
    PipelineStage.HIRED,
  ];

  const columns: PipelineColumn[] = stages.map((stage, index) => ({
    stage,
    candidates: candidates.filter((c) => c.stage === stage),
    count: candidates.filter((c) => c.stage === stage).length,
    stageOrder: index + 1,
  }));

  return {
    id: pipelineDoc.id,
    jobId: data?.jobId,
    jobTitle: data?.jobTitle,
    columns,
    totalCandidates: candidates.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: PipelineRequest = await request.json();

    switch (body.action) {
      case "initialize": {
        const { jobId, jobTitle, recruiterId } = body as InitializeRequest;
        if (!jobId || !jobTitle) {
          return handleApiError(
            null,
            "Missing required fields: jobId and jobTitle",
            400
          );
        }

        const pipelineId = generatePipelineId();

        // Save to Firestore
        await adminDb
          .collection(PIPELINES_COLLECTION)
          .doc(pipelineId)
          .set({
            jobId,
            jobTitle,
            recruiterId: recruiterId || null,
            totalCandidates: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

        const pipeline = await getPipeline(pipelineId);

        logger.info({ pipelineId, jobId }, "Pipeline created in Firestore");

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

        // Check pipeline exists
        const pipelineDoc = await adminDb
          .collection(PIPELINES_COLLECTION)
          .doc(pipelineId)
          .get();

        if (!pipelineDoc.exists) {
          return handleApiError(null, "Pipeline not found", 404);
        }

        const candidate = createCandidate(
          name,
          email,
          position,
          phone,
          resumeUrl
        );

        // Save candidate to subcollection
        await adminDb
          .collection(PIPELINES_COLLECTION)
          .doc(pipelineId)
          .collection(CANDIDATES_SUBCOLLECTION)
          .doc(candidate.id)
          .set({
            ...candidate,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

        // Increment total count
        await adminDb
          .collection(PIPELINES_COLLECTION)
          .doc(pipelineId)
          .update({
            totalCandidates: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });

        const pipeline = await getPipeline(pipelineId);

        logger.info(
          { pipelineId, candidateId: candidate.id },
          "Candidate added to pipeline"
        );

        return NextResponse.json(
          {
            success: true,
            candidate,
            totalCandidates: pipeline?.totalCandidates || 1,
            message: "Candidate added successfully",
          },
          { status: 201 }
        );
      }

      case "move-candidate": {
        const { pipelineId, candidateId, newStage } =
          body as MoveCandidateRequest;

        // Check pipeline exists
        const pipelineDocCheck = await adminDb
          .collection(PIPELINES_COLLECTION)
          .doc(pipelineId)
          .get();

        if (!pipelineDocCheck.exists) {
          return handleApiError(null, "Pipeline not found", 404);
        }

        const candidateRef = adminDb
          .collection(PIPELINES_COLLECTION)
          .doc(pipelineId)
          .collection(CANDIDATES_SUBCOLLECTION)
          .doc(candidateId);

        const candidateDoc = await candidateRef.get();

        if (!candidateDoc.exists) {
          return handleApiError(null, "Candidate not found", 404);
        }

        // Update candidate stage
        await candidateRef.update({
          stage: newStage,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Update pipeline timestamp
        await adminDb.collection(PIPELINES_COLLECTION).doc(pipelineId).update({
          updatedAt: FieldValue.serverTimestamp(),
        });

        const candidateData = candidateDoc.data();

        logger.info(
          { pipelineId, candidateId, newStage },
          "Candidate moved to new stage"
        );

        return NextResponse.json(
          {
            success: true,
            candidate: { ...candidateData, id: candidateId, stage: newStage },
            message: "Candidate moved successfully",
          },
          { status: 200 }
        );
      }

      case "get-stage": {
        const { pipelineId, stage } = body as GetStageRequest;

        const pipeline = await getPipeline(pipelineId);

        if (!pipeline) {
          return handleApiError(null, "Pipeline not found", 404);
        }

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
