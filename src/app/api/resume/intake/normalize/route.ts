import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { NormalizeResumeIntakeRequestSchema } from "@/lib/schemas/api";
import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const parseResult = NormalizeResumeIntakeRequestSchema.safeParse(
      await request.json(),
    );
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Invalid intake payload", 400, request);
    }

    const result = ResumeIntakeNormalizer.normalize(parseResult.data);

    logger.info(
      {
        userId,
        sourceCount: parseResult.data.sources.length,
        extractedFields: result.draft.extractedFields,
      },
      "Resume intake normalized",
    );

    return NextResponse.json(result);
  } catch (routeError: unknown) {
    return handleApiError(routeError, "Failed to normalize resume intake", 500, request);
  }
}
