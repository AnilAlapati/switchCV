/**
 * Background Resume Generation Handler
 *
 * Processes resume generation jobs from the task queue.
 * This function is invoked by Cloud Tasks with extended timeout.
 *
 * NOTE: This is a placeholder implementation. The full async generation
 * requires additional services that are currently in the main app, not
 * in Cloud Functions. This endpoint returns an appropriate error for now.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Types matching the queue service
type JobStatus = "pending" | "processing" | "completed" | "failed";

interface GenerationJobResult {
  response: string;
  model: string;
  resumeId?: string;
  numericId?: number;
  created?: boolean;
  progress: number;
  sessionData?: Record<string, unknown>;
}

const JOBS_COLLECTION = "resumeGenerationJobs";

/**
 * Updates job status in Firestore
 */
async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  updates: {
    progress?: number;
    result?: GenerationJobResult;
    error?: string;
  } = {},
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

  await db.collection(JOBS_COLLECTION).doc(jobId).update(updateData);

  functions.logger.info(`Updated job ${jobId} to status: ${status}`);
}

/**
 * Main handler for processing resume generation jobs
 *
 * NOTE: This is currently a placeholder. The full implementation requires
 * the AI services to be available in the Cloud Functions environment.
 * For now, jobs are processed synchronously via the main API.
 *
 * Authentication: Requires a valid Firebase Bearer token or Cloud Tasks header.
 */
export async function processResumeGenerationHandler(
  req: functions.https.Request,
  res: functions.Response,
): Promise<void> {
  // Validate request method
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // --- Authentication ---
  // Verify Bearer token (Firebase Auth ID token) or Cloud Tasks header
  const authHeader = req.headers.authorization;
  const cloudTasksHeader = req.headers["x-cloudtasks-taskname"];

  if (cloudTasksHeader) {
    // Cloud Tasks invocations: verify the task header exists
    // In production, further OIDC verification should be added
    functions.logger.info("Request authenticated via Cloud Tasks header");
  } else if (authHeader?.startsWith("Bearer ")) {
    // Direct invocation: verify Firebase Auth token
    const idToken = authHeader.split("Bearer ")[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch {
      functions.logger.warn("Invalid Bearer token on processResumeGeneration");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  } else {
    functions.logger.warn("Missing authentication on processResumeGeneration");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { jobId } = req.body;

  if (!jobId) {
    res.status(400).json({ error: "Missing jobId" });
    return;
  }

  functions.logger.info(`Processing resume generation job: ${jobId}`);

  try {
    // Fetch the job from Firestore
    const jobDoc = await db.collection(JOBS_COLLECTION).doc(jobId).get();

    if (!jobDoc.exists) {
      functions.logger.error(`Job not found: ${jobId}`);
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const job = jobDoc.data() as {
      userId: string;
      status: JobStatus;
    };

    // Skip if already processed
    if (job.status !== "pending") {
      functions.logger.info(`Job ${jobId} already ${job.status}, skipping`);
      res.status(200).json({ status: job.status, skipped: true });
      return;
    }

    // Mark the job as failed with an informative message
    // The async processing pipeline is not yet fully implemented
    await updateJobStatus(jobId, "failed", {
      error:
        "Async processing not yet available. Please use synchronous generation via the main API.",
    });

    functions.logger.warn(
      `Job ${jobId}: Async processing not implemented, marked as failed`,
    );

    res.status(501).json({
      error: "Async resume generation not yet implemented",
      message:
        "Please use synchronous generation via the main /api/resume/generate endpoint",
      jobId,
    });
  } catch (error) {
    functions.logger.error(`Failed to process job ${jobId}:`, error);

    await updateJobStatus(jobId, "failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    res.status(500).json({
      error: "Processing failed",
      jobId,
    });
  }
}
