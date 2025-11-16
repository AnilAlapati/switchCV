/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST, GET } from "./route";
import { actions } from "./route";

// Mock the pipeline helper functions
jest.mock("@/lib/recruiterPipelineHelpers", () => ({
  createBulkAction: jest.fn(),
}));

import { createBulkAction } from "@/lib/recruiterPipelineHelpers";

const mockCreateBulkAction = createBulkAction as jest.MockedFunction<
  typeof createBulkAction
>;

describe("POST /api/recruiter/bulk-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actions.clear(); // Clear the in-memory storage before each test
  });

  describe("create action", () => {
    it("should create a bulk action successfully", async () => {
      const mockBulkAction = {
        id: "bulk-123",
        actionType: "move-stage" as const,
        candidateIds: ["candidate-1", "candidate-2"],
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateBulkAction.mockReturnValue(mockBulkAction);

      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
            candidateIds: ["candidate-1", "candidate-2"],
            metadata: { targetStage: "interviewed" },
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        bulkAction: {
          ...mockBulkAction,
          createdAt: mockBulkAction.createdAt.toISOString(),
          updatedAt: mockBulkAction.updatedAt.toISOString(),
        },
        message: "Bulk action created successfully",
      });
      expect(mockCreateBulkAction).toHaveBeenCalledWith("move-stage", [
        "candidate-1",
        "candidate-2",
      ]);
    });

    it("should handle create with missing actionType", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            candidateIds: ["candidate-1"],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error:
          "Missing required fields: actionType, candidateIds (non-empty array)",
      });
    });

    it("should handle create with empty candidateIds", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
            candidateIds: [],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error:
          "Missing required fields: actionType, candidateIds (non-empty array)",
      });
    });

    it("should handle create with missing candidateIds", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error:
          "Missing required fields: actionType, candidateIds (non-empty array)",
      });
    });
  });

  describe("execute action", () => {
    it("should execute a pending bulk action successfully", async () => {
      const mockBulkAction = {
        id: "bulk-123",
        actionType: "move-stage" as const,
        candidateIds: ["candidate-1", "candidate-2"],
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateBulkAction.mockReturnValue(mockBulkAction);

      // First create the action
      const createRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
            candidateIds: ["candidate-1", "candidate-2"],
          }),
        }
      );

      await POST(createRequest);

      // Now execute it
      const executeRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "execute",
            bulkActionId: "bulk-123",
          }),
        }
      );

      const response = await POST(executeRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.bulkAction.status).toBe("completed");
      expect(data.bulkAction.startedAt).toBeDefined();
      expect(data.bulkAction.completedAt).toBeDefined();
      expect(data.message).toBe("Bulk action executed successfully");
    });

    it("should return 404 for non-existent bulk action", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "execute",
            bulkActionId: "non-existent",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Bulk action not found" });
    });

    it("should return 400 for non-pending action", async () => {
      const mockBulkAction = {
        id: "bulk-123",
        actionType: "move-stage" as const,
        candidateIds: ["candidate-1", "candidate-2"],
        status: "completed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateBulkAction.mockReturnValue(mockBulkAction);

      // Create a completed action
      const createRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
            candidateIds: ["candidate-1", "candidate-2"],
          }),
        }
      );

      await POST(createRequest);

      // Try to execute it again (should fail)
      const executeRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "execute",
            bulkActionId: "bulk-123",
          }),
        }
      );

      const response = await POST(executeRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Action is not in pending status" });
    });
  });

  describe("cancel action", () => {
    it("should cancel a pending bulk action successfully", async () => {
      const mockBulkAction = {
        id: "bulk-123",
        actionType: "move-stage" as const,
        candidateIds: ["candidate-1", "candidate-2"],
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateBulkAction.mockReturnValue(mockBulkAction);

      // First create the action
      const createRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
            candidateIds: ["candidate-1", "candidate-2"],
          }),
        }
      );

      await POST(createRequest);

      // Now cancel it
      const cancelRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "cancel",
            bulkActionId: "bulk-123",
          }),
        }
      );

      const response = await POST(cancelRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: "Bulk action cancelled",
      });
    });

    it("should return 404 for non-existent bulk action", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "cancel",
            bulkActionId: "non-existent",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toEqual({ error: "Bulk action not found" });
    });

    it("should return 400 for non-pending action", async () => {
      const mockBulkAction = {
        id: "bulk-123",
        actionType: "move-stage" as const,
        candidateIds: ["candidate-1", "candidate-2"],
        status: "completed" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCreateBulkAction.mockReturnValue(mockBulkAction);

      // Create a completed action
      const createRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "create",
            actionType: "move-stage",
            candidateIds: ["candidate-1", "candidate-2"],
          }),
        }
      );

      await POST(createRequest);

      // Try to cancel it (should fail)
      const cancelRequest = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "cancel",
            bulkActionId: "bulk-123",
          }),
        }
      );

      const response = await POST(cancelRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Only pending actions can be cancelled" });
    });
  });

  describe("error handling", () => {
    it("should return 400 for invalid action", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/recruiter/bulk-actions",
        {
          method: "POST",
          body: JSON.stringify({
            action: "invalid-action",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Invalid action" });
    });

    it("should return 500 for malformed JSON", async () => {
      // Mock request.json() to throw an error
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as any;

      const response = await POST(mockRequest as NextRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Internal server error" });
    });
  });
});

describe("GET /api/recruiter/bulk-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actions.clear(); // Clear the in-memory storage before each test
  });

  it("should return a specific bulk action by id", async () => {
    // Create an action first
    const createRequest = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions",
      {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          actionType: "move-stage",
          candidateIds: ["candidate-1", "candidate-2"],
        }),
      }
    );

    await POST(createRequest);

    // Now get it
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions?id=bulk-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.bulkAction.id).toBe("bulk-123");
    expect(data.bulkAction.actionType).toBe("move-stage");
  });

  it("should return 404 for non-existent bulk action", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions?id=non-existent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Bulk action not found" });
  });

  it("should return all bulk actions", async () => {
    // Create first action
    mockCreateBulkAction.mockReturnValueOnce({
      id: "bulk-1",
      actionType: "move-stage" as const,
      candidateIds: ["c1", "c2"],
      status: "pending" as const,
    });

    const createRequest1 = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions",
      {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          actionType: "move-stage",
          candidateIds: ["c1", "c2"],
        }),
      }
    );

    // Create second action
    mockCreateBulkAction.mockReturnValueOnce({
      id: "bulk-2",
      actionType: "send-email" as const,
      candidateIds: ["c3"],
      status: "pending" as const,
    });

    const createRequest2 = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions",
      {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          actionType: "send-email",
          candidateIds: ["c3"],
        }),
      }
    );

    await POST(createRequest1);
    await POST(createRequest2);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.bulkActions).toHaveLength(2);
    expect(data.count).toBe(2);
    expect(data.byStatus.pending).toBe(2);
    expect(data.byStatus.completed).toBe(0);
  });

  it("should filter bulk actions by status", async () => {
    // Create actions and execute one
    const createRequest1 = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions",
      {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          actionType: "move-stage",
          candidateIds: ["c1"],
        }),
      }
    );

    const createRequest2 = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions",
      {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          actionType: "send-email",
          candidateIds: ["c2"],
        }),
      }
    );

    await POST(createRequest1);
    await POST(createRequest2);

    // For now, just test filtering by pending status
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/bulk-actions?status=pending"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(
      data.bulkActions.every((action: any) => action.status === "pending")
    ).toBe(true);
  });
});
