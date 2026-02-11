import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getCsrfTokenForSession, withCsrfToken } from "@/lib/middleware/csrf";

/**
 * GET /api/csrf-token
 * Returns a CSRF token for authenticated users.
 * The token is also set as a cookie on the response.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const token = getCsrfTokenForSession(userId!);
  const response = NextResponse.json({ csrfToken: token });

  return withCsrfToken(response, userId!);
}
