import { logger } from "@/lib/logger";
/**
 * API Route: Migrate Resumes to Numeric IDs
 * POST /api/admin/migrate-numeric-ids
 *
 * Migrates all resumes to have numeric IDs (for one-time use)
 * or migrates a specific user's resumes
 *
 * SECURITY: Requires admin role. This is a destructive system-wide operation.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  migrateUserResumesToNumericIds,
  migrateAllResumesToNumericIds,
} from "@/lib/resumeMigration";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { MigrateNumericIdsSchema } from "@/lib/schemas/api";
import { verifyAdminRole } from "@/lib/services/userService";

export async function POST(request: NextRequest) {
  try {
    const parseResult = MigrateNumericIdsSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return handleApiError(
        parseResult.error,
        "Provide either userId or migrateAll parameter",
        400
      );
    }
    const { userId, migrateAll } = parseResult.data;

    // SECURITY: Verify authentication
    const { userId: authUserId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    // SECURITY: Verify admin role — only admins can trigger migrations
    if (!authUserId || !(await verifyAdminRole(authUserId))) {
      return handleApiError(null, "Forbidden: Admin access required", 403);
    }

    let result;

    if (migrateAll) {
      logger.info("🔄 Migrating ALL resumes...");
      result = await migrateAllResumesToNumericIds();
      return NextResponse.json({
        success: true,
        message: `Migrated ${result} resumes to numeric IDs`,
        migratedCount: result,
      });
    } else if (userId) {
      logger.info(`🔄 Migrating resumes for user: ${userId}`);
      result = await migrateUserResumesToNumericIds(userId);
      return NextResponse.json({
        success: true,
        message: `Migrated ${result} resume(s) for user to numeric IDs`,
        migratedCount: result,
        userId,
      });
    } else {
      return handleApiError(
        new Error("Provide either userId or migrateAll parameter"),
        "Provide either userId or migrateAll parameter",
        400
      );
    }
  } catch (error) {
    return handleApiError(error, "Migration failed");
  }
}
