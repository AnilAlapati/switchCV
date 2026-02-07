import { NextRequest, NextResponse } from "next/server";
import { setUserRole } from "@/lib/services/userService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { UserRoleSchema } from "@/lib/schemas/api";

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const parseResult = UserRoleSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return handleApiError(
        parseResult.error,
        "Invalid role provided",
        400
      );
    }
    const { role } = parseResult.data;

    await setUserRole(userId!, role);

    logger.info({ userId, role }, "User role updated successfully");

    return NextResponse.json({ success: true, role });
  } catch (err) {
    logger.error({ err }, "Failed to update user role");
    return handleApiError(err, "Failed to update user role");
  }
}
