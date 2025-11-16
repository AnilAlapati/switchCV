/**
 * Recruiter Bulk Actions API Route
 * POST /api/recruiter/bulk-actions
 * Handles batch operations on multiple candidates
 */

import { NextRequest, NextResponse } from "next/server";
import { BulkAction } from "@/lib/recruiterDashboard.types";
import { createBulkAction } from "@/lib/recruiterPipelineHelpers";

interface CreateBulkActionRequest {
  action: "create";
  actionType: string;
  candidateIds: string[];
  metadata?: Record<string, any>;
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

// In-memory bulk action storage (replace with database in production)
const actions = new Map<
  string,
  BulkAction & {
    metadata?: Record<string, any>;
    startedAt?: Date;
    completedAt?: Date;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body: BulkActionRequest = await request.json();

    switch (body.action) {
      case "create": {
        const { actionType, candidateIds, metadata } =
          body as CreateBulkActionRequest;

        if (!actionType || !candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            {
              error:
                "Missing required fields: actionType, candidateIds (non-empty array)",
            },
            { status: 400 }
          );
        }

        const bulkAction = createBulkAction(actionType, candidateIds);
        actions.set(bulkAction.id, {
          ...bulkAction,
          metadata,
        });

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
        const action = actions.get(bulkActionId);

        if (!action) {
          return NextResponse.json(
            { error: "Bulk action not found" },
            { status: 404 }
          );
        }

        if (action.status !== "pending") {
          return NextResponse.json(
            { error: "Action is not in pending status" },
            { status: 400 }
          );
        }

        // Simulate action execution
        await new Promise((resolve) => setTimeout(resolve, 500));

        const updated = {
          ...action,
          status: "completed" as const,
          startedAt: new Date(),
          completedAt: new Date(),
        };
        actions.set(bulkActionId, updated);

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
        const action = actions.get(bulkActionId);

        if (!action) {
          return NextResponse.json(
            { error: "Bulk action not found" },
            { status: 404 }
          );
        }

        if (action.status !== "pending") {
          return NextResponse.json(
            { error: "Only pending actions can be cancelled" },
            { status: 400 }
          );
        }

        actions.delete(bulkActionId);

        return NextResponse.json(
          {
            success: true,
            message: "Bulk action cancelled",
          },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Bulk Actions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const bulkActionId = request.nextUrl.searchParams.get("id");
    const status = request.nextUrl.searchParams.get("status");

    if (bulkActionId) {
      const action = actions.get(bulkActionId);
      if (!action) {
        return NextResponse.json(
          { error: "Bulk action not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          bulkAction: action,
        },
        { status: 200 }
      );
    }

    // Filter by status if provided
    const allActions = Array.from(actions.values());
    const filtered = status
      ? allActions.filter((a) => a.status === status)
      : allActions;

    return NextResponse.json(
      {
        success: true,
        bulkActions: filtered,
        count: filtered.length,
        byStatus: {
          pending: allActions.filter((a) => a.status === "pending").length,
          completed: allActions.filter((a) => a.status === "completed").length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET Bulk Actions API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
