import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { config } from "./config";
import { resilientCall } from "./utils/retryHandler";
import {
  performanceMonitor,
  MetricType,
  alertManager,
  AlertSeverity,
} from "./utils/monitoring";

const db = admin.firestore();
const databaseConfig = config.get("database");
const MAX_BATCH_OPS = 450;

type ResumeDoc =
  FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>;

type ExpirableFields = "deletionScheduledAt" | "expiresAt";

const resolveTimestamp = (value: any): Date | null => {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

async function scanExpiredDocuments(
  field: ExpirableFields,
  cutoffIso: string,
  processedIds: Set<string>,
  handleDoc: (doc: ResumeDoc) => Promise<void>
) {
  const BATCH_SIZE = databaseConfig?.batchSize || 500;
  let hasMore = true;
  let lastDoc: ResumeDoc | null = null;

  while (hasMore) {
    let queryRef = db
      .collection("resumes")
      .where(field, "<", cutoffIso)
      .orderBy(field)
      .limit(BATCH_SIZE);

    if (lastDoc) {
      queryRef = queryRef.startAfter(lastDoc);
    }

    const snapshot = await resilientCall(() => queryRef.get(), {
      retryOptions: { maxAttempts: databaseConfig?.maxRetries || 3 },
      timeoutMs: databaseConfig?.timeoutMs || 10000,
      operationName: `resume-cleanup-scan-${field}`,
    });

    if (snapshot.empty) {
      break;
    }

    for (const doc of snapshot.docs) {
      if (processedIds.has(doc.id)) {
        continue;
      }
      processedIds.add(doc.id);
      await handleDoc(doc);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.size === BATCH_SIZE;
  }
}

export const cleanupExpiredResumesHandler = async (
  context: functions.EventContext
) => {
  return performanceMonitor.measure(
    "functions.cleanupExpiredResumes",
    async () => {
      const processedIds = new Set<string>();
      const nowIso = new Date().toISOString();
      const now = new Date();
      let batch = db.batch();
      let batchOps = 0;
      let deletedCount = 0;

      const commitBatch = async () => {
        if (batchOps === 0) {
          return;
        }

        await resilientCall(() => batch.commit(), {
          retryOptions: { maxAttempts: databaseConfig?.maxRetries || 3 },
          timeoutMs: databaseConfig?.timeoutMs || 10000,
          operationName: "resume-cleanup-commit",
        });

        batch = db.batch();
        batchOps = 0;
      };

      const queueDeletion = async (doc: ResumeDoc) => {
        batch.delete(doc.ref);
        batchOps++;

        const data = doc.data();
        const userId = data.userId;
        if (userId) {
          const userResumeRef = db
            .collection("users")
            .doc(userId)
            .collection("resumes")
            .doc(doc.id);
          batch.delete(userResumeRef);
          batchOps++;
        }

        const globalRef = db.collection("allResumes").doc(doc.id);
        batch.delete(globalRef);
        batchOps++;
        deletedCount++;

        if (batchOps >= MAX_BATCH_OPS) {
          await commitBatch();
        }
      };

      const handleDoc = async (doc: ResumeDoc) => {
        const data = doc.data();
        const removalDate =
          resolveTimestamp(data.deletionScheduledAt) ||
          resolveTimestamp(data.expiresAt);

        if (!removalDate || removalDate > now) {
          return;
        }

        await queueDeletion(doc);
      };

      try {
        await scanExpiredDocuments(
          "deletionScheduledAt",
          nowIso,
          processedIds,
          handleDoc
        );

        await scanExpiredDocuments(
          "expiresAt",
          nowIso,
          processedIds,
          handleDoc
        );

        await commitBatch();

        functions.logger.info("Resume cleanup completed", {
          deletedCount,
          eventId: context.eventId,
        });
      } catch (error) {
        await commitBatch();
        const message = error instanceof Error ? error.message : String(error);
        await alertManager.sendAlert(
          AlertSeverity.ERROR,
          "cleanupExpiredResumes failed",
          message,
          {
            eventId: context.eventId,
            stack: error instanceof Error ? error.stack : undefined,
          }
        );
        functions.logger.error("cleanupExpiredResumes failed", {
          eventId: context.eventId,
          message,
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }

      return null;
    },
    MetricType.BACKGROUND_TASK,
    { eventId: context.eventId }
  );
};
