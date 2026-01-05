/**
 * Recruiter Bulk Actions API Route
 * POST /api/recruiter/bulk-actions
 * Handles batch operations on multiple candidates
 *
 * FIXED: Now persists to Firestore instead of in-memory Map
 */

import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
// eslint-disable-next-line no-restricted-imports
import { FieldValue } from "firebase-admin/firestore";
import { BulkAction } from "@/lib/recruiterDashboard.types";
import { createBulkAction } from "@/lib/recruiterPipelineHelpers";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

interface CreateBulkActionRequest {
  action: "create";
  actionType: string;
  candidateIds: string[];
  metadata?: Record<string, unknown>;
}

interface ExecuteActionRequest {
  action: "execute";
  bulkActionId: string;
}

interface CancelActionRequest {
  action: "cancel";
  bulkActionId: string;
}

type BulkActionRequest =
  | CreateBulkActionRequest
  | ExecuteActionRequest
  | CancelActionRequest;

const BULK_ACTIONS_COLLECTION = "recruiterBulkActions";

type BulkActionWithMeta = BulkAction & {
  metadata?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
};

/**
 * Helper to verify recruiter role
 */
async function verifyRecruiterRole(userId: string): Promise<boolean> {
  const userSnap = await adminDb.collection("users").doc(userId).get();
  const userData = userSnap.data();
  return userData?.role === "recruiter" || userData?.role === "admin";
}

/**
 * Helper to convert Firestore doc to BulkAction object
 */
function docToBulkAction(
  doc: FirebaseFirestore.DocumentSnapshot
): BulkActionWithMeta | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    actionType: data.actionType,
    candidateIds: data.candidateIds || [],
    status: data.status || "pending",
    targetStage: data.targetStage,
    targetPriority: data.targetPriority,
    noteContent: data.noteContent,
    interviewType: data.interviewType,
    interviewTime: data.interviewTime?.toDate(),
    templateId: data.templateId,
    executedAt: data.executedAt?.toDate(),
    executedBy: data.executedBy,
    result: data.result,
    metadata: data.metadata,
    createdAt: data.createdAt?.toDate() || new Date(),
    startedAt: data.startedAt?.toDate(),
    completedAt: data.completedAt?.toDate(),
  } as BulkActionWithMeta;
}

export async function POST(request: NextRequest) {
  const { userId: authUserId, error: authError } = await getAuthenticatedUserId(
    request
  );
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const body: BulkActionRequest = await request.json();

    switch (body.action) {
      case "create": {
        const { actionType, candidateIds, metadata } =
          body as CreateBulkActionRequest;

        if (!actionType || !candidateIds || candidateIds.length === 0) {
          return handleApiError(
            null,
            "Missing required fields: actionType, candidateIds (non-empty array)",
            400
          );
        }

        const bulkAction = createBulkAction(actionType, candidateIds);

        // Save to Firestore
        await adminDb
          .collection(BULK_ACTIONS_COLLECTION)
          .doc(bulkAction.id)
          .set({
            ...bulkAction,
            metadata: metadata || null,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: authUserId,
          });

        logger.info(
          { bulkActionId: bulkAction.id, actionType },
          "Bulk action created"
        );

        return NextResponse.json(
          {
            success: true,
            bulkAction,
            message: "Bulk action created successfully",
          },
          { status: 201 }
        );
      }

      case "execute": {
        const { bulkActionId } = body as ExecuteActionRequest;

        const actionRef = adminDb
          .collection(BULK_ACTIONS_COLLECTION)
          .doc(bulkActionId);
        const actionDoc = await actionRef.get();

        if (!actionDoc.exists) {
          return handleApiError(null, "Bulk action not found", 404);
        }

        const actionData = actionDoc.data()!;

        if (actionData.status !== "pending") {
          return handleApiError(null, "Action is not in pending status", 400);
        }

        // Execute the bulk action (this would normally do actual work)
        // For now, we just mark it as completed
        await actionRef.update({
          status: "completed",
          startedAt: FieldValue.serverTimestamp(),
          completedAt: FieldValue.serverTimestamp(),
        });

        const updated = docToBulkAction(await actionRef.get());

        logger.info({ bulkActionId }, "Bulk action executed");

        return NextResponse.json(
          {
            success: true,
            bulkAction: updated,
            message: "Bulk action executed successfully",
          },
          { status: 200 }
        );
      }

      case "cancel": {
        const { bulkActionId } = body as CancelActionRequest;

        const actionRef = adminDb
          .collection(BULK_ACTIONS_COLLECTION)
          .doc(bulkActionId);
        const actionDoc = await actionRef.get();

        if (!actionDoc.exists) {
          return handleApiError(null, "Bulk action not found", 404);
        }

        const actionData = actionDoc.data()!;

        if (actionData.status !== "pending") {
          return handleApiError(
            null,
            "Only pending actions can be cancelled",
            400
          );
        }

        // Delete the action from Firestore
        await actionRef.delete();

        logger.info({ bulkActionId }, "Bulk action cancelled");

        return NextResponse.json(
          {
            success: true,
            message: "Bulk action cancelled",
          },
          { status: 200 }
        );
      }

      default:
        return handleApiError(null, "Invalid action", 400);
    }
  } catch (error) {
    logger.error({ err: error }, "Bulk actions API error");
    return handleApiError(error, "Internal server error");
  }
}

export async function GET(request: NextRequest) {
  const { userId: authUserId, error: authError } = await getAuthenticatedUserId(
    request
  );
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const bulkActionId = request.nextUrl.searchParams.get("id");
    const status = request.nextUrl.searchParams.get("status");

    if (bulkActionId) {
      const actionDoc = await adminDb
        .collection(BULK_ACTIONS_COLLECTION)
        .doc(bulkActionId)
        .get();

      if (!actionDoc.exists) {
        return handleApiError(null, "Bulk action not found", 404);
      }

      return NextResponse.json(
        {
          success: true,
          bulkAction: docToBulkAction(actionDoc),
        },
        { status: 200 }
      );
    }

    // Query with optional status filter
    let query: FirebaseFirestore.Query = adminDb.collection(
      BULK_ACTIONS_COLLECTION
    );

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(100).get();

    const allActions: BulkActionWithMeta[] = snapshot.docs.map(
      (doc) => docToBulkAction(doc)!
    );

    // Count by status
    const pendingCount = allActions.filter(
      (a) => a.status === "pending"
    ).length;
    const completedCount = allActions.filter(
      (a) => a.status === "completed"
    ).length;

    return NextResponse.json(
      {
        success: true,
        bulkActions: allActions,
        count: allActions.length,
        byStatus: {
          pending: pendingCount,
          completed: completedCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ err: error }, "Bulk actions GET error");
    return handleApiError(error, "Internal server error");
  }
}
