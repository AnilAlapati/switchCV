import { NextRequest, NextResponse } from "next/server";
import { getSelectableModels } from "@/lib/services/aiProviderService";
import { getUserTier } from "@/lib/services/userService";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const userTier = await getUserTier(userId);
    const rateLimitResult = await checkDistributedRateLimit(userId, {
      tier: userTier,
      scope: "default",
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const models = getSelectableModels(userTier);

    return NextResponse.json(
      { tier: userTier, models },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "Failed to load AI models");
  }
}
