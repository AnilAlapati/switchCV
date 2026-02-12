import { NextRequest, NextResponse } from "next/server";
import { templateService } from "@/lib/services/templateService";
import { handleApiError } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/utils/rateLimit";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    // Rate limit by IP (public endpoint)
    const ip = _request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await checkRateLimit(`templates:${ip}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    logger.info("Fetching all resume templates");

    const templates = await templateService.getAllTemplates();

    return NextResponse.json({
      success: true,
      templates,
      count: templates.length,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching templates");
    return handleApiError(error, "Failed to fetch templates", 500);
  }
}
