import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, setCustomClaims } from "@/lib/dal";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import {
  UserSettingsQuerySchema,
  UserSettingsUpdateSchema,
} from "@/lib/schemas/api";
import { cacheService } from "@/lib/services/cacheService";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    // Verify that the user can only access their own settings
    const queryParseResult = UserSettingsQuerySchema.safeParse({
      userId: new URL(request.url).searchParams.get("userId"),
    });
    if (!queryParseResult.success) {
      return handleApiError(queryParseResult.error, "userId is required", 400);
    }
    const requestedUserId = queryParseResult.data.userId;

    if (userId !== requestedUserId) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot access other user's settings",
        403,
      );
    }

    // Get user settings (cached for 5 minutes, invalidated on PUT)
    const cacheKey = `user-settings:${userId}`;
    const settings = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const userRef = collectionRef(COLLECTIONS.USERS).doc(userId!);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return null;
        }

        const userData = userDoc.data();

        // Ensure role field is in sync with isRecruiter (migration fix)
        const isRecruiter = userData?.isRecruiter || false;
        if (userData && userData.role === undefined) {
          await userRef.set(
            { role: isRecruiter ? "recruiter" : "jobseeker" },
            { merge: true },
          );
        }

        return {
          isRecruiter,
          displayName: userData?.displayName || "",
          companyName: userData?.companyName || "",
          notifications: userData?.notifications || {
            marketing: true,
            security: true,
            activity: false,
          },
          privacy: userData?.privacy || {
            profilePublic: true,
            searchable: true,
          },
          updatedAt: userData?.settingsUpdatedAt || new Date().toISOString(),
        };
      },
      { ttlSeconds: 300 },
    );

    if (!settings) {
      return handleApiError(new Error("User not found"), "User not found", 404);
    }

    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching user settings:");
    return handleApiError(error, "Failed to fetch settings");
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    let body;
    try {
      body = await request.json();
    } catch {
      return handleApiError(
        new Error("Invalid JSON"),
        "Invalid JSON in request body",
        400,
      );
    }

    const parseResult = UserSettingsUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "userId is required", 400);
    }

    const {
      userId: requestedUserId,
      isRecruiter,
      companyName,
      displayName,
      notifications,
      privacy,
    } = parseResult.data;

    // Verify that the user can only update their own settings
    if (userId !== requestedUserId) {
      return handleApiError(
        new Error("Forbidden"),
        "Forbidden: Cannot update other user's settings",
        403,
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      settingsUpdatedAt: new Date().toISOString(),
    };

    // IMPORTANT: If isRecruiter changes, we MUST also update Firebase Auth custom claims.
    // Without this, the auth token still carries the old role, causing the UI to
    // show the old role on page refresh. This was a recurring bug.
    // Preferred: Use /api/user/update-role for role changes instead of this endpoint.
    // This is a defense-in-depth measure in case this endpoint is called directly.
    // See: docs/ROLE_CHANGE_FIX.md
    if (typeof isRecruiter === "boolean") {
      const newRole = isRecruiter ? "recruiter" : "jobseeker";
      updateData.isRecruiter = isRecruiter;
      updateData.role = newRole;
      updateData.roleUpdatedAt = new Date().toISOString();

      // Update Firebase Auth custom claims so the token reflects the new role
      try {
        await setCustomClaims(userId!, { role: newRole });
        logger.info(
          { userId, newRole },
          "Role custom claims updated via settings endpoint",
        );
      } catch (claimsError) {
        logger.warn(
          { userId, err: claimsError },
          "Failed to update custom claims in settings endpoint — role updated in Firestore only",
        );
      }
    }
    if (companyName !== undefined && companyName !== null) {
      updateData.companyName = companyName;
    }
    if (displayName !== undefined && displayName !== null) {
      updateData.displayName = displayName;
    }

    // Validate and update notifications
    if (notifications && typeof notifications === "object") {
      updateData.notifications = notifications;
    }

    // Validate and update privacy
    if (privacy && typeof privacy === "object") {
      updateData.privacy = privacy;
    }

    // Use set with merge to create the document if it doesn't exist
    await collectionRef(COLLECTIONS.USERS).doc(userId!).set(updateData, {
      merge: true,
    });

    // Invalidate cached settings
    await cacheService.invalidate(`user-settings:${userId}`);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    logger.error({ err: error }, "Error updating user settings:");
    return handleApiError(error, "Failed to update settings");
  }
}
