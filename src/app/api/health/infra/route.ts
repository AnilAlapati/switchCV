/**
 * GET /api/health/infra
 *
 * Infrastructure health check endpoint.
 * Validates that critical Firestore structures exist and are properly configured.
 *
 * Returns:
 * - 200 OK: All checks pass
 * - 503 Service Unavailable: Critical infrastructure missing
 *
 * This endpoint should be called:
 * 1. After every deployment (via CI/CD)
 * 2. On application startup
 * 3. Periodically via monitoring
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/dal";
import { ID_GENERATION } from "@/config/constants";
import { logger } from "@/lib/logger";

interface HealthCheck {
  name: string;
  status: "ok" | "warning" | "error";
  message?: string;
  details?: Record<string, unknown>;
}

interface InfraHealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  environment: string;
  checks: HealthCheck[];
}

async function checkResumeIdCounter(): Promise<HealthCheck> {
  try {
    const counterDoc = await getDb().doc(ID_GENERATION.COUNTER_DOC_PATH).get();

    if (!counterDoc.exists) {
      return {
        name: "resumeIdCounter",
        status: "error",
        message: "Counter document does not exist",
      };
    }

    // Check shards
    const shardsSnapshot = await getDb()
      .collection(ID_GENERATION.SHARD_COLLECTION_PATH)
      .get();

    const shardCount = shardsSnapshot.size;
    const expectedShards = ID_GENERATION.SHARD_COUNT;

    if (shardCount === 0) {
      return {
        name: "resumeIdCounter",
        status: "error",
        message: "No shards found - counter not initialized",
        details: { shardCount: 0, expected: expectedShards },
      };
    }

    if (shardCount !== expectedShards) {
      return {
        name: "resumeIdCounter",
        status: "warning",
        message: `Shard count mismatch: ${shardCount}/${expectedShards}`,
        details: { shardCount, expected: expectedShards },
      };
    }

    // Get highest issued ID for info
    let highestId = 0;
    shardsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.lastIssued > highestId) {
        highestId = data.lastIssued;
      }
    });

    return {
      name: "resumeIdCounter",
      status: "ok",
      message: `Counter healthy with ${shardCount} shards`,
      details: { shardCount, highestIssuedId: highestId },
    };
  } catch (error) {
    logger.error({ err: error }, "Error checking resume ID counter");
    return {
      name: "resumeIdCounter",
      status: "error",
      message: "Check failed",
    };
  }
}

async function checkSystemCollections(): Promise<HealthCheck> {
  try {
    const requiredCollections = ["users", "resumes", "drafts", "notifications"];
    const missing: string[] = [];

    for (const collection of requiredCollections) {
      const snapshot = await getDb().collection(collection).limit(1).get();
      // We just check if we can query, not if it has documents
      // An empty collection is fine for a fresh deployment
      if (snapshot === undefined) {
        missing.push(collection);
      }
    }

    if (missing.length > 0) {
      return {
        name: "systemCollections",
        status: "warning",
        message: `Missing or inaccessible collections: ${missing.join(", ")}`,
        details: { missing },
      };
    }

    return {
      name: "systemCollections",
      status: "ok",
      message: "All required collections accessible",
    };
  } catch (error) {
    logger.error({ err: error }, "Error checking system collections");
    return {
      name: "systemCollections",
      status: "error",
      message: "Check failed",
    };
  }
}

async function checkBillingConfig(): Promise<HealthCheck> {
  try {
    const billingDoc = await getDb().doc("system/billing").get();

    if (!billingDoc.exists) {
      return {
        name: "billingConfig",
        status: "warning",
        message: "Billing configuration document not found",
      };
    }

    return {
      name: "billingConfig",
      status: "ok",
      message: "Billing configuration exists",
    };
  } catch {
    return {
      name: "billingConfig",
      status: "warning",
      message: "Could not verify billing config",
    };
  }
}

export async function GET(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const checks: HealthCheck[] = await Promise.all([
      checkResumeIdCounter(),
      checkSystemCollections(),
      checkBillingConfig(),
    ]);

    // Determine overall status
    const hasError = checks.some((c) => c.status === "error");
    const hasWarning = checks.some((c) => c.status === "warning");

    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (hasError) {
      overallStatus = "unhealthy";
    } else if (hasWarning) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    // Sanitize check details — remove internal info from public response
    const sanitizedChecks = checks.map(({ name, status, message }) => ({
      name,
      status,
      message,
    }));

    const response: InfraHealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      checks: sanitizedChecks,
    };

    const statusCode = overallStatus === "unhealthy" ? 503 : 200;
    const duration = Date.now() - startTime;

    logger.info(
      { status: overallStatus, duration, checks: checks.length },
      "Infrastructure health check completed",
    );

    return NextResponse.json(
      { ...response, durationMs: duration },
      { status: statusCode },
    );
  } catch (error) {
    logger.error({ err: error }, "Infrastructure health check failed");

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "unknown",
        checks: [
          {
            name: "healthCheck",
            status: "error",
            message: "Health check failed to execute",
          },
        ],
        durationMs: Date.now() - startTime,
      },
      { status: 503 },
    );
  }
}
