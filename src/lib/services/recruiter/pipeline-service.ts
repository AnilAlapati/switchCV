import {
    COLLECTIONS,
    collectionRef,
    serverTimestamp,
    increment,
} from "@/lib/dal";
import {
    RecruitmentPipeline,
    PipelineStage,
    Candidate,
    PipelineColumn,
} from "@/lib/recruiterDashboard.types";
import { createCandidate as createCandidateBase } from "@/lib/recruiterPipeline";
import { generatePipelineId } from "@/lib/recruiterPipelineHelpers";


export interface InitializeRequest {
    action: "initialize";
    jobId: string;
    jobTitle: string;
    recruiterId?: string;
}

export interface AddCandidateRequest {
    action: "add-candidate";
    pipelineId: string;
    name: string;
    email: string;
    position: string;
    phone?: string;
    resumeUrl?: string;
}

export interface MoveCandidateRequest {
    action: "move-candidate";
    pipelineId: string;
    candidateId: string;
    newStage: PipelineStage;
}

export interface GetStageRequest {
    action: "get-stage";
    pipelineId: string;
    stage: PipelineStage;
}

export type PipelineRequest =
    | InitializeRequest
    | AddCandidateRequest
    | MoveCandidateRequest
    | GetStageRequest;

const CANDIDATES_SUBCOLLECTION = "candidates";

/**
 * Helper to verify recruiter role
 */
export async function verifyRecruiterRole(userId: string): Promise<boolean> {
    const userSnap = await collectionRef(COLLECTIONS.USERS).doc(userId).get();
    const userData = userSnap.data();
    return userData?.role === "recruiter" || userData?.role === "admin";
}

/**
 * Get pipeline from Firestore
 */
export async function getPipeline(
    pipelineId: string
): Promise<RecruitmentPipeline | null> {
    const pipelineDoc = await collectionRef(COLLECTIONS.RECRUITER_PIPELINES)
        .doc(pipelineId)
        .get();

    if (!pipelineDoc.exists) {
        return null;
    }

    const data = pipelineDoc.data();

    // Fetch candidates from subcollection
    const candidatesSnap = await collectionRef(COLLECTIONS.RECRUITER_PIPELINES)
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

/**
 * Initialize a new pipeline
 */
export async function initializePipeline(jobId: string, jobTitle: string, recruiterId: string): Promise<RecruitmentPipeline | null> {
    const pipelineId = generatePipelineId();

    await collectionRef(COLLECTIONS.RECRUITER_PIPELINES)
        .doc(pipelineId)
        .set({
            jobId,
            jobTitle,
            recruiterId,
            totalCandidates: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

    return getPipeline(pipelineId);
}

/**
 * Add candidate to pipeline
 */
export async function addCandidate(
    pipelineId: string,
    candidateData: { name: string; email: string; position: string; phone?: string; resumeUrl?: string }
): Promise<{ candidate: Candidate; totalCandidates: number } | null> {
    const candidate = createCandidateBase(
        candidateData.name,
        candidateData.email,
        candidateData.position,
        candidateData.phone,
        candidateData.resumeUrl
    );

    await collectionRef(COLLECTIONS.RECRUITER_PIPELINES)
        .doc(pipelineId)
        .collection(CANDIDATES_SUBCOLLECTION)
        .doc(candidate.id)
        .set({
            ...candidate,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

    await collectionRef(COLLECTIONS.RECRUITER_PIPELINES)
        .doc(pipelineId)
        .update({
            totalCandidates: increment(1),
            updatedAt: serverTimestamp(),
        });

    const pipeline = await getPipeline(pipelineId);
    return { candidate, totalCandidates: pipeline?.totalCandidates || 1 };
}

/**
 * Move candidate to a new stage
 */
export async function moveCandidate(
    pipelineId: string,
    candidateId: string,
    newStage: PipelineStage
): Promise<Candidate | null> {
    const candidateRef = collectionRef(COLLECTIONS.RECRUITER_PIPELINES)
        .doc(pipelineId)
        .collection(CANDIDATES_SUBCOLLECTION)
        .doc(candidateId);

    const candidateDoc = await candidateRef.get();
    if (!candidateDoc.exists) return null;

    await candidateRef.update({
        stage: newStage,
        updatedAt: serverTimestamp(),
    });

    await collectionRef(COLLECTIONS.RECRUITER_PIPELINES)
        .doc(pipelineId)
        .update({
            updatedAt: serverTimestamp(),
        });

    return { ...candidateDoc.data(), id: candidateId, stage: newStage } as Candidate;
}
