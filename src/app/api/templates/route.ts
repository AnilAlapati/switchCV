import { NextRequest, NextResponse } from "next/server";
import { templateService } from "@/lib/services/templateService";
import { handleApiError } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
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
