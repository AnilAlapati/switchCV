import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { alertManager, AlertSeverity } from "../utils/monitoring";

const EXPECTED_DIMENSION = 768;
const SAMPLE_SIZE = 100;
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

function vectorNorm(values: number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
}

function toMillis(value: unknown): number | null {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return (value.toDate() as Date).getTime();
  }

  return null;
}

export const vectorQualityCheckHandler = async (
  _context: functions.EventContext,
): Promise<void> => {
  const db = admin.firestore();
  const now = Date.now();

  functions.logger.info("[VectorQualityCheck] Starting scheduled daily vector quality check");

  try {
    const snapshot = await db
      .collection("resumes")
      .where("isPublic", "==", true)
      .limit(SAMPLE_SIZE)
      .get();

    let indexedCount = 0;
    let missingEmbeddingCount = 0;
    let wrongDimensionCount = 0;
    let zeroVectorCount = 0;
    let staleEmbeddingCount = 0;
    let totalNorm = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const embedding = data.embedding;

      if (!Array.isArray(embedding)) {
        missingEmbeddingCount += 1;
        continue;
      }

      indexedCount += 1;
      if (embedding.length !== EXPECTED_DIMENSION) {
        wrongDimensionCount += 1;
      }

      const norm = vectorNorm(embedding);
      totalNorm += norm;
      if (norm === 0) {
        zeroVectorCount += 1;
      }

      const updatedAt = toMillis(data.embeddingUpdatedAt);
      if (updatedAt === null || now - updatedAt > STALE_AFTER_MS) {
        staleEmbeddingCount += 1;
      }
    }

    const issueCount =
      missingEmbeddingCount +
      wrongDimensionCount +
      zeroVectorCount +
      staleEmbeddingCount;
    const qualityScore =
      snapshot.size === 0 ? 1 : Math.max(0, 1 - issueCount / snapshot.size);

    const report = {
      checkedAt: new Date(now).toISOString(),
      sampleSize: snapshot.size,
      expectedDimension: EXPECTED_DIMENSION,
      indexedCount,
      missingEmbeddingCount,
      wrongDimensionCount,
      zeroVectorCount,
      staleEmbeddingCount,
      averageVectorNorm: indexedCount === 0 ? 0 : totalNorm / indexedCount,
      qualityScore,
    };

    functions.logger.info("[VectorQualityCheck] Quality check completed", report);

    // Save report to monitoring history
    const dateKey = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
    await db
      .collection("monitoring")
      .doc("vectorQuality")
      .collection("history")
      .doc(dateKey)
      .set(report);

    // Also update current status
    await db
      .collection("monitoring")
      .doc("vectorQuality")
      .set({
        latestReport: report,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    // Alert if quality score is below 95%
    if (qualityScore < 0.95) {
      await alertManager.sendAlert(
        AlertSeverity.WARNING,
        `Vector Search Quality Degraded: ${(qualityScore * 100).toFixed(1)}%`,
        `Vector search quality score has dropped to ${(qualityScore * 100).toFixed(1)}%.\n\n` +
          `Missing Embeddings: ${missingEmbeddingCount}\n` +
          `Wrong Dimensions: ${wrongDimensionCount}\n` +
          `Zero Vectors: ${zeroVectorCount}\n` +
          `Stale Embeddings: ${staleEmbeddingCount}\n\n` +
          `Please trigger a reindexing to fix missing or stale embeddings.`,
      );
    }

  } catch (error) {
    functions.logger.error("[VectorQualityCheck] Daily quality check failed", error);
  }
};
