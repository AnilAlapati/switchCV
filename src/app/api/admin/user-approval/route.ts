import { NextRequest, NextResponse } from "next/server";
import { createCorsHeaders, validateCorsOrigin } from "@/lib/utils/cors";
import { handleApiError, getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { UserApprovalService } from "@/lib/services/userApprovalService";
import { isAdmin } from "@/lib/services/adminService";

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
            return handleApiError(null, "Forbidden - Admin access required", 403, request);
        }

        // Fetch pending approvals via service
        const { approvals, totalPending } = await UserApprovalService.getPendingApprovals();

        return NextResponse.json(
            {
                approvals,
                totalPending,
            },
            {
                status: 200,
                headers: createCorsHeaders(request),
            }
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
        const { userId: adminUserId, error: authError } = await getAuthenticatedUserId(request);
        if (authError) return authError;

        // Verify admin role via service
        if (!(await isAdmin(adminUserId!))) {
            return handleApiError(null, "Forbidden - Admin access required", 403, request);
        }

        // Parse request body
        let body;
        try {
            body = await request.json();
        } catch (err) {
            return handleApiError(err, "Invalid JSON payload", 400, request);
        }

        const { approvalId, action, reason } = body;

        if (!approvalId || !action) {
            return handleApiError(null, "Missing required fields", 400, request);
        }

        if (action !== "approve" && action !== "reject") {
            return handleApiError(null, "Invalid action", 400, request);
        }

        // Process approval via service
        await UserApprovalService.processApproval(
            approvalId,
            action,
            adminUserId!,
            reason
        );

        return NextResponse.json(
            { success: true, action },
            {
                status: 200,
                headers: createCorsHeaders(request),
            }
        );
    } catch (error) {
        if (error instanceof Error && error.message === "Approval request not found") {
            return handleApiError(error, error.message, 404, request);
        }
        return handleApiError(error, "User approval POST failed", 500, request);
    }
}
