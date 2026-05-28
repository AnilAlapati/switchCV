import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

export interface VectorQualityReport {
  checkedAt: string;
  sampleSize: number;
  expectedDimension: number;
  indexedCount: number;
  missingEmbeddingCount: number;
  wrongDimensionCount: number;
  zeroVectorCount: number;
  staleEmbeddingCount: number;
  averageVectorNorm: number;
  qualityScore: number;
}

const DEFAULT_EXPECTED_DIMENSION = 768;
const DEFAULT_SAMPLE_SIZE = 100;
const DEFAULT_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

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
    return value.toDate().getTime();
  }

  return null;
}

export async function checkVectorQuality(options: {
  sampleSize?: number;
  expectedDimension?: number;
  staleAfterMs?: number;
} = {}): Promise<VectorQualityReport> {
  const sampleSize = options.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  const expectedDimension =
    options.expectedDimension ?? DEFAULT_EXPECTED_DIMENSION;
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const now = Date.now();

  const snapshot = await adminDb
    .collection("resumes")
    .where("isPublic", "==", true)
    .limit(sampleSize)
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
    if (embedding.length !== expectedDimension) {
      wrongDimensionCount += 1;
    }

    const norm = vectorNorm(embedding);
    totalNorm += norm;
    if (norm === 0) {
      zeroVectorCount += 1;
    }

    const updatedAt = toMillis(data.embeddingUpdatedAt);
    if (updatedAt === null || now - updatedAt > staleAfterMs) {
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

  const report: VectorQualityReport = {
    checkedAt: new Date(now).toISOString(),
    sampleSize: snapshot.size,
    expectedDimension,
    indexedCount,
    missingEmbeddingCount,
    wrongDimensionCount,
    zeroVectorCount,
    staleEmbeddingCount,
    averageVectorNorm: indexedCount === 0 ? 0 : totalNorm / indexedCount,
    qualityScore,
  };

  logger.info(report, "Vector quality check completed");
  return report;
}
