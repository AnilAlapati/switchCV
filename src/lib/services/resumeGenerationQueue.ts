/**
 * Resume Generation Job Queue Service
 *
 * Manages async resume generation jobs stored in Firestore.
 * Jobs are processed by Cloud Tasks for non-blocking execution.
 */

import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { FieldValue } from "firebase-admin/firestore";

// Job status enum
export type JobStatus = "pending" | "processing" | "completed" | "failed";

// Job document structure
export interface GenerationJob {
    id: string;
    userId: string;
    status: JobStatus;
    progress: number;
    payload: GenerationJobPayload;
    result?: GenerationJobResult;
    error?: string;
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
    completedAt?: FirebaseFirestore.Timestamp;
}

export interface GenerationJobPayload {
    message: string;
    conversationHistory: Array<{
        id: string;
        content: string;
        isUser: boolean;
        timestamp: string;
    }>;
    sessionData?: unknown;
    modelId?: string;
    inputSources?: Array<"chat" | "paste" | "pdf" | "docx">;
    desiredStyle?: "professional" | "executive" | "innovator";
    strictMode?: boolean;
    userTier: string;
}

export interface GenerationJobResult {
    response: string;
    model: string;
    resumeId?: string;
    numericId?: number;
    created?: boolean;
    progress: number;
    sessionData?: unknown;
}

const JOBS_COLLECTION = "resumeGenerationJobs";

/**
 * Creates a new generation job in Firestore
 */
export async function createGenerationJob(
    userId: string,
    payload: GenerationJobPayload
): Promise<{ jobId: string }> {
    const jobRef = adminDb.collection(JOBS_COLLECTION).doc();

    const job: Omit<GenerationJob, "id"> = {
        userId,
        status: "pending",
        progress: 0,
        payload,
        createdAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
        updatedAt: FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    };

    await jobRef.set(job);

    logger.info({ jobId: jobRef.id, userId }, "📋 Created resume generation job");

    return { jobId: jobRef.id };
}

/**
 * Gets the current status of a generation job
 */
export async function getJobStatus(
    jobId: string,
    userId: string
): Promise<GenerationJob | null> {
    const jobDoc = await adminDb.collection(JOBS_COLLECTION).doc(jobId).get();

    if (!jobDoc.exists) {
        return null;
    }

    const job = { id: jobDoc.id, ...jobDoc.data() } as GenerationJob;

    // Security: Ensure user can only access their own jobs
    if (job.userId !== userId) {
        logger.warn(
            { jobId, requestingUser: userId, jobOwner: job.userId },
            "⚠️ Unauthorized job access attempt"
        );
        return null;
    }

    return job;
}

/**
 * Updates job status and optional result/error
 */
export async function updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates: {
        progress?: number;
        result?: GenerationJobResult;
        error?: string;
    } = {}
): Promise<void> {
    const updateData: Record<string, unknown> = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (updates.progress !== undefined) {
        updateData.progress = updates.progress;
    }

    if (updates.result) {
        updateData.result = updates.result;
    }

    if (updates.error) {
        updateData.error = updates.error;
    }

    if (status === "completed" || status === "failed") {
        updateData.completedAt = FieldValue.serverTimestamp();
    }

    await adminDb.collection(JOBS_COLLECTION).doc(jobId).update(updateData);

    logger.info({ jobId, status }, "📋 Updated job status");
}

/**
 * Cleans up old completed/failed jobs (called by scheduled cleanup)
 */
export async function cleanupOldJobs(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);

    const oldJobs = await adminDb
        .collection(JOBS_COLLECTION)
        .where("completedAt", "<", cutoff)
        .limit(100)
        .get();

    if (oldJobs.empty) {
        return 0;
    }

    const batch = adminDb.batch();
    oldJobs.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logger.info({ count: oldJobs.size }, "🧹 Cleaned up old generation jobs");

    return oldJobs.size;
}
