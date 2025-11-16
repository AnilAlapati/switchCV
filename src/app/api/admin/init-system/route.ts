/**
 * POST /api/admin/init-system
 *
 * Initialize the system collection and numeric ID counter
 * This endpoint creates the system/resumeIdCounter document if it doesn't exist
 *
 * Usage:
 * curl -X POST http://localhost:3000/api/admin/init-system
 *
 * Response:
 * { success: true, message: "System initialized", counter: { currentId: 0, ... } }
 */

import {
  initializeIdCounter,
  getCurrentIdCounter,
} from "@/lib/numericIdGenerator";

export async function POST() {
  try {
    console.log("🔧 Initializing system collection and ID counter...");

    // Initialize the ID counter
    await initializeIdCounter();

    // Get the current counter value
    const currentId = await getCurrentIdCounter();

    console.log("✅ System initialized successfully");
    console.log("📊 Current ID counter:", currentId);

    return Response.json(
      {
        success: true,
        message: "✅ System initialized successfully",
        status: "initialized",
        counter: {
          currentId,
          message: `Ready to generate IDs starting from ${currentId + 1}`,
        },
        nextResumeId: currentId + 1,
        firebaseLocation: "system/resumeIdCounter",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error initializing system:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        success: false,
        message: "❌ Failed to initialize system",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/init-system
 *
 * Check the current system status
 * Returns current ID counter value and status
 */
export async function GET() {
  try {
    const currentId = await getCurrentIdCounter();

    return Response.json(
      {
        success: true,
        message: "✅ System status retrieved",
        status: "active",
        counter: {
          currentId,
          message: `${currentId} IDs used, next ID will be ${currentId + 1}`,
        },
        nextResumeId: currentId + 1,
        firebaseLocation:
          "system/resumeIdCounter (document path: system/resumeIdCounter)",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error checking system status:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return Response.json(
      {
        success: false,
        message: "❌ Failed to check system status",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
