// API Route to force refresh AI model cache
// Call this endpoint when you notice model issues
// GET /api/ai/refresh-models

import { NextRequest, NextResponse } from "next/server";
import {
  applyRateLimit,
  attachRateLimitHeaders,
  getAuthenticatedUserId,
  getClientIp,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { getUserRole } from "@/lib/services/userService";
import { getConstants } from "@/lib/getSystemConfig";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error || !userId) {
      return error ?? handleApiError(null, "Unauthorized", 401);
    }

    const role = await getUserRole(userId);
    if (role !== "admin") {
      return handleApiError(null, "Forbidden: Admin access required", 403);
    }

    const clientIp = getClientIp(request);
    const constants = await getConstants();
    const rateCheck = await applyRateLimit(`refresh-models:${clientIp}`, {
      limit: constants.RATE_LIMITS.ADMIN_REFRESH_PER_MINUTE,
      windowMs: 60 * 1000,
    });
    if (!rateCheck.allowed) {
      return rateCheck.response;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return handleApiError(
        new Error("Gemini API key not configured"),
        "Gemini API key not configured",
        500
      );
    }

    // Fetch latest models
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const allModels =
      data.models?.map((m: any) => ({
        name: m.name.replace("models/", ""),
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      })) || [];

    const compatibleModels = allModels.filter((m: any) =>
      m.methods?.includes("generateContent")
    );

    const jsonResponse = NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total: allModels.length,
      compatible: compatibleModels.length,
      models: compatibleModels,
      message: "Model cache will be refreshed on next API call",
    });
    attachRateLimitHeaders(jsonResponse, rateCheck.result);
    return jsonResponse;
  } catch (error) {
    return handleApiError(error, "Failed to refresh models");
  }
}
