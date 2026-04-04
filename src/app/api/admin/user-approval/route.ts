import { NextRequest, NextResponse } from "next/server";
import { createCorsHeaders, validateCorsOrigin } from "@/lib/utils/cors";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { UserApprovalService } from "@/lib/services/userApprovalService";
import { isAdmin } from "@/lib/services/adminService";
import { UserApprovalActionSchema } from "@/lib/schemas/api";

/**
 * GET /api/admin/user-approval
 * Retrieve pending user approvals for admin review
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate CORS
    const corsValidation = validateCorsOrigin(request);
    if (!corsValidation.allowed) {
      return handleApiError(null, "Origin not allowed", 403, request);
    }

    // Verify authentication
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) return authError;

    // Verify admin role via service
    if (!(await isAdmin(userId!))) {
      return handleApiError(
        null,
        "Forbidden - Admin access required",
        403,
        request,
      );
    }

    // Fetch pending approvals via service
    const { approvals, totalPending } =
      await UserApprovalService.getPendingApprovals();

    return NextResponse.json(
      {
        approvals,
        totalPending,
      },
      {
        status: 200,
        headers: {
          ...createCorsHeaders(request),
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return handleApiError(error, "User approval GET failed", 500, request);
  }
}

/**
 * POST /api/admin/user-approval
 * Approve or reject a user approval request
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate CORS
    const corsValidation = validateCorsOrigin(request);
    if (!corsValidation.allowed) {
      return handleApiError(null, "Origin not allowed", 403, request);
    }

    // Verify authentication
    const { userId: adminUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    // Verify admin role via service
    if (!(await isAdmin(adminUserId!))) {
      return handleApiError(
        null,
        "Forbidden - Admin access required",
        403,
        request,
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return handleApiError(err, "Invalid JSON payload", 400, request);
    }

    const parseResult = UserApprovalActionSchema.safeParse(body);
    if (!parseResult.success) {
      const bodyObj =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)
          : undefined;
      const isMissingRequired =
        !bodyObj ||
        bodyObj.approvalId === undefined ||
        bodyObj.action === undefined;
      const hasActionIssue = parseResult.error.issues.some(
        (issue) => issue.path[0] === "action",
      );

      return handleApiError(
        parseResult.error,
        isMissingRequired || !hasActionIssue
          ? "Missing required fields"
          : "Invalid action",
        400,
        request,
      );
    }

    const { approvalId, action, reason } = parseResult.data;

    // Process approval via service
    await UserApprovalService.processApproval(
      approvalId,
      action,
      adminUserId!,
      reason,
    );

    return NextResponse.json(
      { success: true, action },
      {
        status: 200,
        headers: createCorsHeaders(request),
      },
    );
  } catch (error) {
    const errorMessage = String(error);
    if (errorMessage === "Approval request not found") {
      return handleApiError(error, errorMessage, 404, request);
    }
    return handleApiError(error, "User approval POST failed", 500, request);
  }
}
