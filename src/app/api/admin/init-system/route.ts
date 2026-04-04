/**
 * POST /api/admin/init-system
 *
 * Initialize the system collection and numeric ID counter
 * This endpoint creates the system/resumeIdCounter document if it doesn't exist
 *
 * SECURITY: Requires admin authentication
 *
 * Usage:
 * curl -X POST http://localhost:3000/api/admin/init-system \
 *   -H "Authorization: Bearer <admin-token>"
 *
 * Response:
 * { success: true, message: "System initialized", counter: { currentId: 0, ... } }
 */

import { NextRequest } from "next/server";
import {
  initializeIdCounter,
  getCurrentIdCounter,
} from "@/lib/numericIdGenerator";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
import { logger } from "@/lib/logger";

/**
 * Verify that the authenticated user has admin role
 */
async function verifyAdminRole(userId: string): Promise<boolean> {
  try {
    const userDoc = await collectionRef(COLLECTIONS.USERS).doc(userId).get();
    const userData = userDoc.data();
    return userData?.role === "admin";
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to verify admin role");
    return false;
  }
}

export async function POST(request: NextRequest) {
  // SECURITY FIX: Require authentication
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError) {
    return authError;
  }

  // SECURITY FIX: Require admin role
  const isAdmin = await verifyAdminRole(userId!);
  if (!isAdmin) {
    return handleApiError(null, "Forbidden: Admin access required", 403);
  }

  try {
    logger.info(
      { userId },
      "Admin initializing system collection and ID counter...",
    );

    // Initialize the ID counter
    await initializeIdCounter();

    // Get the current counter value
    const currentId = await getCurrentIdCounter();

    logger.info({ userId, currentId }, "System initialized successfully");

    return Response.json(
      {
        success: true,
        message: "System initialized successfully",
        status: "initialized",
        counter: {
          currentId,
          message: `Ready to generate IDs starting from ${currentId + 1}`,
        },
        nextResumeId: currentId + 1,
        firebaseLocation: "system/resumeIdCounter",
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error({ err: error, userId }, "Error initializing system");
    return handleApiError(error, "Failed to initialize system", 500);
  }
}

/**
 * GET /api/admin/init-system
 *
 * Check the current system status
 * Returns current ID counter value and status
 *
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  // SECURITY FIX: Require authentication
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError) {
    return authError;
  }

  // SECURITY FIX: Require admin role
  const isAdmin = await verifyAdminRole(userId!);
  if (!isAdmin) {
    return handleApiError(null, "Forbidden: Admin access required", 403);
  }

  try {
    const currentId = await getCurrentIdCounter();

    logger.info({ userId, currentId }, "Admin retrieved system status");

    return Response.json(
      {
        success: true,
        message: "System status retrieved",
        status: "active",
        counter: {
          currentId,
          message: `${currentId} IDs used, next ID will be ${currentId + 1}`,
        },
        nextResumeId: currentId + 1,
        firebaseLocation: "system/resumeIdCounter",
      },
      { status: 200, headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    logger.error({ err: error, userId }, "Error checking system status");
    return handleApiError(error, "Failed to check system status", 500);
  }
}
