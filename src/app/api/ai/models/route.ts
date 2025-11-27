import { NextResponse } from "next/server";
import { getSelectableModels } from "@/lib/services/aiProviderService";
import { getUserTierWithDevOverride } from "@/lib/services/userService";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: Request) {
  try {
    const userTier = await getUserTierWithDevOverride(request);
    const models = getSelectableModels(userTier);

    return NextResponse.json({ tier: userTier, models });
  } catch (error) {
    return handleApiError(error, "Failed to load AI models");
  }
}
