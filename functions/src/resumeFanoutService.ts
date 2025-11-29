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
}

const resolveBoolean = (value: any, fallback = false): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const resolveVisibility = (resume: ResumeDoc): "public" | "private" => {
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
  resume: ResumeDoc
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
  resume: ResumeDoc
): Record<string, unknown> => ({
  resumeId,
  userId: resume.userId,
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
  resume: ResumeDoc | undefined
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
          "Failed to delete derived allResumes doc"
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
            "Failed to delete derived user resume"
          );
        })
    );

    deletions.push(
      userDoc
        .collection("userResumes")
        .doc(resumeId)
        .delete()
        .catch((error) => {
          functions.logger.info(
            { resumeId, userId },
            "Legacy userResumes doc absent during delete"
          );
        })
    );
  }

  await Promise.allSettled(deletions);
};

const upsertDerivedDocs = async (
  resumeId: string,
  resume: ResumeDoc
): Promise<void> => {
  const userId = resume.userId;
  if (!userId) {
    functions.logger.warn(
      { resumeId },
      "Resume fan-out skipped due to missing userId"
    );
    return;
  }

  const userPayload = buildUserResumePayload(resumeId, resume);
  const globalPayload = buildGlobalResumePayload(resumeId, resume);

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
          "Legacy userResumes doc skipped"
        );
      }),
    db
      .collection("allResumes")
      .doc(resumeId)
      .set(globalPayload, { merge: true }),
  ];

  await Promise.allSettled(writes);
};

export const fanOutResumeDocuments = functions.firestore
  .document("resumes/{resumeId}")
  .onWrite(async (change, context) => {
    const resumeId = context.params.resumeId;

    if (!change.after.exists) {
      await deleteDerivedDocs(resumeId, change.before.data() as ResumeDoc);
      return null;
    }

    const resumeData = change.after.data() as ResumeDoc;
    await upsertDerivedDocs(resumeId, resumeData);
    return null;
  });
