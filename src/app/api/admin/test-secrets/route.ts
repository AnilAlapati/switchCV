/**
 * Test endpoint for Secret Manager verification
 *
 * GET /api/admin/test-secrets
 *
 * Tests secret access and rotation status.
 * Admin-only endpoint for deployment verification.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  getSecret,
  SecretManagerService,
} from "@/lib/services/secretManagerService";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const { userId, role, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    // Admin-only access
    if (role !== "admin") {
      return handleApiError(
        null,
        "Unauthorized - Admin access required",
        403,
        request
      );
    }

    logger.info("Secret Manager test initiated", { userId });

    const service = SecretManagerService.getInstance();
    const results: Record<string, any> = {};

    // Test 1: Get all rotation statuses
    try {
      const rotationStatus = await service.checkRotationStatus();
      results.rotationStatus = {
        success: true,
        secretCount: rotationStatus.length,
        secrets: rotationStatus.map((s) => ({
          name: s.name,
          rotationPeriod: s.rotationPeriod,
          nextRotation: s.nextRotation.toISOString(),
          daysUntilRotation: Math.ceil(
            (s.nextRotation.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          ),
        })),
      };
    } catch (err) {
      results.rotationStatus = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Test 2: Check for secrets needing rotation
    try {
      const needingRotation = await service.getSecretsNeedingRotation();
      results.needingRotation = {
        success: true,
        count: needingRotation.length,
        secrets: needingRotation.map((s) => s.name),
      };
    } catch (err) {
      results.needingRotation = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Test 3: Access a required secret (don't return value for security)
    try {
      const testSecret = await getSecret("GEMINI_API_KEY", userId);
      results.secretAccess = {
        success: true,
        secretTested: "GEMINI_API_KEY",
        accessible: !!testSecret,
        length: testSecret.length,
        // Never return actual value!
      };
    } catch (err) {
      results.secretAccess = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Test 4: Cache functionality
    try {
      const start = Date.now();
      await getSecret("GEMINI_API_KEY", userId);
      const cachedTime = Date.now() - start;

      service.clearCache();

      const start2 = Date.now();
      await getSecret("GEMINI_API_KEY", userId);
      const freshTime = Date.now() - start2;

      results.cacheTest = {
        success: true,
        cachedAccessTime: `${cachedTime}ms`,
        freshAccessTime: `${freshTime}ms`,
        cacheEffective: cachedTime < freshTime,
      };
    } catch (err) {
      results.cacheTest = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Overall status
    const allTestsPassed = Object.values(results).every(
      (r: any) => r.success === true
    );

    logger.info("Secret Manager test completed", {
      userId,
      allTestsPassed,
      results,
    });

    return NextResponse.json(
      {
        success: allTestsPassed,
        message: allTestsPassed
          ? "All secret manager tests passed"
          : "Some tests failed - check results",
        timestamp: new Date().toISOString(),
        results,
      },
      { status: 200 }
    );
  } catch (err) {
    return handleApiError(err, "Secret Manager test failed");
  }
}
