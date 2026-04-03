import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { verifyAdminAccess } from "@/lib/services/adminService";
import { getConversationSessions } from "@/lib/services/conversationStorageService";
import { z } from "zod";

const QuerySchema = z.object({
  userId: z.string().min(1, "userId is required"),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * GET /api/admin/conversations?userId=xxx&limit=20
 * Returns conversation sessions for a given user. Admin-only.
 */
export async function GET(request: NextRequest) {
  const { userId: adminId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const isAdmin = await verifyAdminAccess(adminId!);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parseResult = QuerySchema.safeParse({
      userId: searchParams.get("userId"),
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query params", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, limit } = parseResult.data;

    const sessions = await getConversationSessions(userId, { limit });

    return NextResponse.json({ sessions, count: sessions.length });
  } catch (err) {
    return handleApiError(err, "Failed to fetch conversation sessions");
  }
}
