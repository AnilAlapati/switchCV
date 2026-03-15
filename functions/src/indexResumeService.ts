/**
 * Resume Indexing Service
 *
 * Generates vector embeddings for published resumes using Gemini.
 * Triggered when a resume is published or updated in the resumes collection.
 *
 * @module functions/indexResumeService
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit, RateLimitPresets } from "./middleware/rateLimiter";
import { BillingService } from "./services/billingService";
import { BUDGET_CAPS } from "./lib/billing/shared";

// Constants (mirrored from frontend config)
const AI_SEARCH = {
  EMBEDDING_MODEL: "text-embedding-004",
  VECTOR_DIMENSION: 768,
} as const;

const db = admin.firestore();

/**
 * Generates a searchable text profile from resume data.
 * Combines relevant fields into a single string for embedding.
 */
function generateSearchProfile(
  resumeData: FirebaseFirestore.DocumentData,
): string {
  // Handle both flat structure and nested profile structure
  const profile = resumeData.profile || resumeData;

  const parts: string[] = [];

  // Title/Role
  if (profile.title) {
    parts.push(`Role: ${profile.title}`);
  }

  // Summary
  if (profile.summary) {
    parts.push(`Summary: ${profile.summary}`);
  }

  // Skills
  if (profile.skills && Array.isArray(profile.skills)) {
    const skillNames = profile.skills
      .map((s: { name?: string }) => s.name)
      .filter(Boolean);
    if (skillNames.length > 0) {
      parts.push(`Skills: ${skillNames.join(", ")}`);
    }
  }

  // Experience
  if (profile.experience && Array.isArray(profile.experience)) {
    const expSummaries = profile.experience.map(
      (exp: { role?: string; company?: string; description?: string }) =>
        `${exp.role || ""} at ${exp.company || ""}: ${exp.description || ""}`,
    );
    if (expSummaries.length > 0) {
      parts.push(`Experience: ${expSummaries.join(". ")}`);
    }
  }

  // Education
  if (profile.education && Array.isArray(profile.education)) {
    const eduSummaries = profile.education.map(
      (edu: { degree?: string; institution?: string }) =>
        `${edu.degree || ""} from ${edu.institution || ""}`,
    );
    if (eduSummaries.length > 0) {
      parts.push(`Education: ${eduSummaries.join(". ")}`);
    }
  }

  // Location (if available in personalInfo)
  if (profile.personalInfo?.location) {
    parts.push(`Location: ${profile.personalInfo.location}`);
  }

  return parts.join(". ");
}

/**
 * Generates embedding vector using Gemini text-embedding-004 model.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: AI_SEARCH.EMBEDDING_MODEL });

  const result = await model.embedContent(text);
  const embedding = result.embedding.values;

  if (!embedding || embedding.length !== AI_SEARCH.VECTOR_DIMENSION) {
    throw new Error(
      `Invalid embedding dimension: expected ${AI_SEARCH.VECTOR_DIMENSION}, got ${embedding?.length}`,
    );
  }

  return embedding;
}

/**
 * Firestore trigger: Index resume on write (create/update)
 *
 * Generates a vector embedding when a resume is published or updated.
 * Skips if the resume is marked as "being edited" (unpublished for editing).
 * Debounces rapid writes: skips re-indexing if last embedding was generated
 * within the past 60 seconds (prevents redundant Gemini API calls during editing).
 */
const DEBOUNCE_MS = 60_000; // 60 seconds

const indexResumeOnWriteHandler = async (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
  context: functions.EventContext,
) => {
  const resumeId = context.params.resumeId;

  // Handle deletion - no action needed
  if (!change.after.exists) {
    functions.logger.info(`Resume ${resumeId} deleted, no indexing needed`);
    return null;
  }

  const resumeData = change.after.data();

  if (!resumeData) {
    functions.logger.warn(`Resume ${resumeId} has no data`);
    return null;
  }

  // Skip if resume is being edited (unpublished temporarily)
  if (resumeData.isBeingEdited === true) {
    functions.logger.info(
      `Resume ${resumeId} is being edited, skipping indexing`,
    );
    return null;
  }

  // 1. Generate search profile text first to check if content actually changed
  const searchProfile = generateSearchProfile(resumeData);

  if (!searchProfile || searchProfile.length < 10) {
    functions.logger.warn(
      `Resume ${resumeId} has insufficient content for indexing`,
    );
    return null;
  }

  // 2. Check if content has meaningfully changed (before debounce)
  const previousSearchProfile = resumeData.searchProfile;
  if (previousSearchProfile === searchProfile) {
    functions.logger.info(
      `Resume ${resumeId} content unchanged, skipping re-indexing`,
    );
    return null;
  }

  // 3. Debounce: skip if last embedding was generated within DEBOUNCE_MS
  // Only applies when content DID change — prevents rapid re-indexing
  const lastEmbeddingTime = resumeData.embeddingUpdatedAt;
  if (lastEmbeddingTime) {
    const lastUpdate =
      typeof lastEmbeddingTime === "string"
        ? new Date(lastEmbeddingTime).getTime()
        : (lastEmbeddingTime.toMillis?.() ?? 0);
    const elapsed = Date.now() - lastUpdate;

    if (elapsed < DEBOUNCE_MS) {
      functions.logger.info(
        `Resume ${resumeId} was indexed ${Math.round(elapsed / 1000)}s ago, debouncing (threshold: ${DEBOUNCE_MS / 1000}s)`,
      );
      return null;
    }
  }

  // Budget enforcement: check system cap before embedding generation
  const systemBudgetOk = await BillingService.checkSystemBudget(
    BUDGET_CAPS.enterprise,
  );
  if (!systemBudgetOk) {
    functions.logger.warn(
      `System budget exceeded — skipping embedding for resume ${resumeId}`,
    );
    return null;
  }

  try {
    functions.logger.info(`Generating embedding for resume ${resumeId}`);

    const embedding = await generateEmbedding(searchProfile);
    const now = new Date().toISOString();

    // Update the resume with embedding data
    await db.collection("resumes").doc(resumeId).update({
      embedding,
      searchProfile,
      embeddingUpdatedAt: now,
    });

    functions.logger.info(
      `Successfully indexed resume ${resumeId} with ${embedding.length}-dim embedding`,
    );

    return { success: true, resumeId };
  } catch (error) {
    functions.logger.error(`Failed to index resume ${resumeId}:`, error);

    // Don't throw - we don't want to retry indefinitely
    // The resume is still usable, just not searchable via AI
    return { success: false, resumeId, error: String(error) };
  }
};

export { indexResumeOnWriteHandler };

export const indexResumeOnWrite = functions.firestore
  .document("resumes/{resumeId}")
  .onWrite(indexResumeOnWriteHandler);

/**
 * Callable function to manually trigger re-indexing of a resume.
 * Useful for backfilling existing resumes or recovering from errors.
 */
const reindexResumeHandler = async (
  data: { resumeId: string },
  context: functions.https.CallableContext,
) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to reindex resumes",
    );
  }

  // Rate limiting (using JOB_MATCHING preset as proxy for heavy op)
  const rateLimit = await checkRateLimit(
    context.auth.uid,
    RateLimitPresets.JOB_MATCHING,
  );
  if (!rateLimit.allowed) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
    );
  }

  const { resumeId } = data;
  if (!resumeId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "resumeId is required",
    );
  }

  // Get the resume
  const resumeDoc = await db.collection("resumes").doc(resumeId).get();

  if (!resumeDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Resume not found");
  }

  const resumeData = resumeDoc.data()!;

  // Verify ownership (or admin)
  const callerUid = context.auth.uid;
  const userDoc = await db.collection("users").doc(callerUid).get();
  const isAdmin = userDoc.data()?.role === "admin";

  if (resumeData.userId !== callerUid && !isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Not authorized to reindex this resume",
    );
  }

  // Generate and save embedding
  const searchProfile = generateSearchProfile(resumeData);
  const embedding = await generateEmbedding(searchProfile);

  await db.collection("resumes").doc(resumeId).update({
    embedding,
    searchProfile,
    embeddingUpdatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    resumeId,
    embeddingDimension: embedding.length,
  };
};

export { reindexResumeHandler };

export const reindexResume = functions.https.onCall(reindexResumeHandler);
