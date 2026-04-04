import { NextRequest, NextResponse } from "next/server";
import { getApiDocs } from "@/lib/swagger";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  const { error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const spec = await getApiDocs();
    return NextResponse.json(spec, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return handleApiError(err, "Failed to generate API docs");
  }
}
