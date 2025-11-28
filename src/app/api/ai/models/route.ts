import { NextRequest, NextResponse } from "next/server";
import { getSelectableModels } from "@/lib/services/aiProviderService";
import { getUserTier } from "@/lib/services/userService";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const userTier = await getUserTier(userId);
    const models = getSelectableModels(userTier);

    return NextResponse.json({ tier: userTier, models });
  } catch (error) {
    return handleApiError(error, "Failed to load AI models");
  }
}
