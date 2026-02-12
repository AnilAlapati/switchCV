/**
 * useBulkActions Hook
 * State management for bulk operations on candidates
 */

import { useState, useCallback } from "react";
import { BulkAction } from "@/lib/recruiterDashboard.types";
import { createBulkAction } from "@/lib/recruiterPipelineHelpers";

interface UseBulkActionsReturn {
  pendingActions: BulkAction[];
  completedActions: BulkAction[];
  loading: boolean;
  error: string | null;
  createAction: (action: string, candidateIds: string[]) => void;
  executeAction: (actionId: string) => Promise<void>;
  cancelAction: (actionId: string) => void;
  clearCompleted: () => void;
  getActionStatus: (
    actionId: string
  ) => "pending" | "completed" | "failed" | null;
}

/**
 * Hook for managing bulk operations on candidates
 */
export function useBulkActions(): UseBulkActionsReturn {
  const [pendingActions, setPendingActions] = useState<BulkAction[]>([]);
  const [completedActions, setCompletedActions] = useState<BulkAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, string>>(
    {}
  );

  const createAction = useCallback((action: string, candidateIds: string[]) => {
    try {
      setLoading(true);
      const bulkAction = createBulkAction(action, candidateIds);
      setPendingActions((prev) => [...prev, bulkAction]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create bulk action"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const executeAction = useCallback(
    async (actionId: string) => {
      try {
        setLoading(true);
        const action = pendingActions.find((a) => a.id === actionId);

        if (!action) throw new Error("Action not found");

        // Simulate action execution
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Move from pending to completed
        setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
        setCompletedActions((prev) => [
          ...prev,
          { ...action, status: "completed" as const },
        ]);
        setActionResults((prev) => ({
          ...prev,
          [actionId]: "success",
        }));
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to execute action"
        );
        setActionResults((prev) => ({
          ...prev,
          [actionId]: "failed",
        }));
      } finally {
        setLoading(false);
      }
    },
    [pendingActions]
  );

  const cancelAction = useCallback((actionId: string) => {
    try {
      setLoading(true);
      setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
      setActionResults((prev) => {
        const updated = { ...prev };
        delete updated[actionId];
        return updated;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel action");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCompleted = useCallback(() => {
    try {
      setCompletedActions((prev) => {
        // Use the prev state to get accurate completed action IDs
        setActionResults((prevResults) => {
          const updated = { ...prevResults };
          prev.forEach((action) => {
            delete updated[action.id];
          });
          return updated;
        });
        return [];
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear completed actions"
      );
    }
  }, []);

  const getActionStatus = useCallback(
    (actionId: string): "pending" | "completed" | "failed" | null => {
      if (pendingActions.some((a) => a.id === actionId)) return "pending";
      if (completedActions.some((a) => a.id === actionId)) {
        return actionResults[actionId] === "failed" ? "failed" : "completed";
      }
      return null;
    },
    [pendingActions, completedActions, actionResults]
  );

  return {
    pendingActions,
    completedActions,
    loading,
    error,
    createAction,
    executeAction,
    cancelAction,
    clearCompleted,
    getActionStatus,
  };
}
