import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface ResumeDoc {
  userId?: string;
  numericId?: number;
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  visibility?: string;
  isPublic?: boolean;
  published?: boolean;
  status?: string;
  isBeingEdited?: boolean;
}

const resolveBoolean = (value: unknown, fallback = false): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

/**
 * Canonical visibility resolution for fan-out.
 * INVARIANT: isBeingEdited:true forces "private" regardless of other fields.
 */
const resolveVisibility = (resume: ResumeDoc): "public" | "private" => {
  // Enforce editing invariant — never expose during editing
  if (resume.isBeingEdited === true) return "private";

  if (typeof resume.visibility === "string") {
    return resume.visibility === "public" ? "public" : "private";
  }
  return resolveBoolean(resume.isPublic) ? "public" : "private";
};

const safeTimestamp = (value?: string): string => {
  if (!value) {
    return new Date().toISOString();
  }
  return value;
};

const resolveNumericId = (resumeId: string): number | null => {
  const parsed = Number(resumeId);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildUserResumePayload = (
  resumeId: string,
  resume: ResumeDoc,
): Record<string, unknown> => {
  const visibility = resolveVisibility(resume);
  return {
    resumeId,
    userId: resume.userId,
    numericId: resume.numericId ?? resolveNumericId(resumeId),
    title: resume.title ?? "Untitled Resume",
    status: resume.status ?? "active",
    isPublic: resolveBoolean(resume.isPublic),
    visibility,
    published: resolveBoolean(resume.published),
    createdAt: safeTimestamp(resume.createdAt),
    updatedAt: safeTimestamp(resume.updatedAt),
    lastSyncedAt: new Date().toISOString(),
  };
};

const buildGlobalResumePayload = (
  resumeId: string,
  resume: ResumeDoc,
): Record<string, unknown> => ({
  resumeId,
  // SECURITY: userId intentionally omitted from recruiter-readable collection
  numericId: resume.numericId ?? resolveNumericId(resumeId),
  title: resume.title ?? "Untitled Resume",
  isPublic: resolveBoolean(resume.isPublic),
  visibility: resolveVisibility(resume),
  published: resolveBoolean(resume.published),
  status: resume.status ?? "active",
  createdAt: safeTimestamp(resume.createdAt),
  updatedAt: safeTimestamp(resume.updatedAt),
  lastSyncedAt: new Date().toISOString(),
});

const deleteDerivedDocs = async (
  resumeId: string,
  resume: ResumeDoc | undefined,
): Promise<void> => {
  const userId = resume?.userId;

  const deletions: Promise<unknown>[] = [
    db
      .collection("allResumes")
      .doc(resumeId)
      .delete()
      .catch((error) => {
        functions.logger.warn(
          { resumeId, error: error instanceof Error ? error.message : error },
          "Failed to delete derived allResumes doc",
        );
      }),
  ];

  if (userId) {
    const userDoc = db.collection("users").doc(userId);
    deletions.push(
      userDoc
        .collection("resumes")
        .doc(resumeId)
        .delete()
        .catch((error) => {
          functions.logger.warn(
            {
              resumeId,
              userId,
              error: error instanceof Error ? error.message : error,
            },
            "Failed to delete derived user resume",
          );
        }),
    );

    deletions.push(
      userDoc
        .collection("userResumes")
        .doc(resumeId)
        .delete()
        .catch((error) => {
          functions.logger.info(
            { resumeId, userId },
            "Legacy userResumes doc absent during delete",
          );
        }),
    );
  }

  await Promise.allSettled(deletions);
};

const upsertDerivedDocs = async (
  resumeId: string,
  resume: ResumeDoc,
): Promise<void> => {
  const userId = resume.userId;
  if (!userId) {
    functions.logger.warn(
      { resumeId },
      "Resume fan-out skipped due to missing userId",
    );
    return;
  }

  const userPayload = buildUserResumePayload(resumeId, resume);
  const globalPayload = buildGlobalResumePayload(resumeId, resume);
  const visibility = resolveVisibility(resume);
  const isPublicResume =
    visibility === "public" && resolveBoolean(resume.published);

  const userDoc = db.collection("users").doc(userId);

  const writes: Promise<unknown>[] = [
    userDoc
      .collection("resumes")
      .doc(resumeId)
      .set(userPayload, { merge: true }),
    userDoc
      .collection("userResumes")
      .doc(resumeId)
      .set(userPayload, { merge: true })
      .catch(() => {
        functions.logger.info(
          { resumeId, userId },
          "Legacy userResumes doc skipped",
        );
      }),
  ];

  // SECURITY: Only fan out public, published resumes to the global collection.
  // Private or unpublished resumes must be removed from allResumes.
  if (isPublicResume) {
    writes.push(
      db
        .collection("allResumes")
        .doc(resumeId)
        .set(globalPayload, { merge: true }),
    );
  } else {
    writes.push(
      db
        .collection("allResumes")
        .doc(resumeId)
        .delete()
        .catch((error) => {
          functions.logger.info(
            { resumeId, error: error instanceof Error ? error.message : error },
            "allResumes doc absent during private resume cleanup",
          );
        }),
    );
  }

  await Promise.allSettled(writes);
};

const IDEMPOTENCY_COLLECTION = "processedEvents";
const IDEMPOTENCY_TTL_HOURS = 24;

const fanOutResumeDocumentsHandler = async (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
  context: functions.EventContext,
) => {
  const resumeId = context.params.resumeId;
  const eventId = context.eventId;

  // Idempotency check — skip if this event was already processed
  const eventRef = db.collection(IDEMPOTENCY_COLLECTION).doc(eventId);
  const eventDoc = await eventRef.get();
  if (eventDoc.exists) {
    functions.logger.info(
      { eventId, resumeId },
      "Duplicate fan-out event skipped",
    );
    return null;
  }

  if (!change.after.exists) {
    await deleteDerivedDocs(resumeId, change.before.data() as ResumeDoc);
  } else {
    const resumeData = change.after.data() as ResumeDoc;
    await upsertDerivedDocs(resumeId, resumeData);
  }

  // Mark event as processed with TTL
  await eventRef.set({
    processedAt: new Date().toISOString(),
    resumeId,
    expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 3600 * 1000),
  });

  return null;
};

export { fanOutResumeDocumentsHandler };

export const fanOutResumeDocuments = functions.firestore
  .document("resumes/{resumeId}")
  .onWrite(fanOutResumeDocumentsHandler);
