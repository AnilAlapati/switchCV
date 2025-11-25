import { renderHook, act } from "@testing-library/react";
import { useBulkActions } from "@/hooks/useBulkActions";
import { createBulkAction } from "@/lib/recruiterPipelineHelpers";

// Mock the helper function
jest.mock("@/lib/recruiterPipelineHelpers", () => ({
  createBulkAction: jest.fn(),
}));

describe("useBulkActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createBulkAction as jest.Mock).mockImplementation(
      (actionType, candidateIds) => ({
        id: `action-${Date.now()}`,
        actionType,
        candidateIds,
        status: "pending",
      })
    );
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useBulkActions());

    expect(result.current.pendingActions).toEqual([]);
    expect(result.current.completedActions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should create a bulk action", () => {
    const { result } = renderHook(() => useBulkActions());
    const candidateIds = ["c1", "c2"];

    act(() => {
      result.current.createAction("email", candidateIds);
    });

    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0].actionType).toBe("email");
    expect(result.current.pendingActions[0].candidateIds).toEqual(candidateIds);
    expect(createBulkAction).toHaveBeenCalledWith("email", candidateIds);
  });

  it("should execute an action successfully", async () => {
    const { result } = renderHook(() => useBulkActions());
    const candidateIds = ["c1"];

    act(() => {
      result.current.createAction("email", candidateIds);
    });

    const actionId = result.current.pendingActions[0].id;

    await act(async () => {
      await result.current.executeAction(actionId);
    });

    expect(result.current.pendingActions).toHaveLength(0);
    expect(result.current.completedActions).toHaveLength(1);
    expect(result.current.completedActions[0].id).toBe(actionId);
    expect(result.current.completedActions[0].status).toBe("completed");
    expect(result.current.getActionStatus(actionId)).toBe("completed");
  });

  it("should handle execution failure", async () => {
    const { result } = renderHook(() => useBulkActions());

    // Try to execute non-existent action
    await act(async () => {
      await result.current.executeAction("non-existent-id");
    });

    expect(result.current.error).toBe("Action not found");
    expect(result.current.getActionStatus("non-existent-id")).toBeNull();
  });

  it("should cancel an action", () => {
    const { result } = renderHook(() => useBulkActions());

    act(() => {
      result.current.createAction("email", ["c1"]);
    });

    const actionId = result.current.pendingActions[0].id;

    act(() => {
      result.current.cancelAction(actionId);
    });

    expect(result.current.pendingActions).toHaveLength(0);
    expect(result.current.getActionStatus(actionId)).toBeNull();
  });

  it("should clear completed actions", async () => {
    const { result } = renderHook(() => useBulkActions());

    act(() => {
      result.current.createAction("email", ["c1"]);
    });

    const actionId = result.current.pendingActions[0].id;

    await act(async () => {
      await result.current.executeAction(actionId);
    });

    expect(result.current.completedActions).toHaveLength(1);

    act(() => {
      result.current.clearCompleted();
    });

    expect(result.current.completedActions).toHaveLength(0);
    expect(result.current.getActionStatus(actionId)).toBeNull();
  });

  it("should handle create action error", () => {
    (createBulkAction as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Creation failed");
    });

    const { result } = renderHook(() => useBulkActions());

    act(() => {
      result.current.createAction("email", ["c1"]);
    });

    expect(result.current.error).toBe("Creation failed");
    expect(result.current.pendingActions).toHaveLength(0);
  });
});
