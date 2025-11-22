/**
 * API Route: Migrate Resumes to Numeric IDs
 * POST /api/admin/migrate-numeric-ids
 *
 * Migrates all resumes to have numeric IDs (for one-time use)
 * or migrates a specific user's resumes
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, migrateAll } = body;

    // For security, check if request is authenticated
    const { error } = await getAuthenticatedUserId(request);
    if (error) return error;

    let result;

    if (migrateAll) {
      console.log("🔄 Migrating ALL resumes...");
      result = await migrateAllResumesToNumericIds();
      return NextResponse.json({
        success: true,
        message: `Migrated ${result} resumes to numeric IDs`,
        migratedCount: result,
      });
    } else if (userId) {
      console.log(`🔄 Migrating resumes for user: ${userId}`);
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
