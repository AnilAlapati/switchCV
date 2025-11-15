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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, migrateAll } = body;

    // For security, check if request is authenticated (optional - add your auth check)
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      return NextResponse.json(
        { error: "Provide either userId or migrateAll parameter" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
