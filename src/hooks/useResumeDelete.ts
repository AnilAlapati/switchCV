"use client";

/**
 * useResumeDelete Hook
 *
 * React hook for deleting resumes with convenient async/await interface
 * and automatic loading/error state management.
 *
 * Features:
 * - Delete by document ID, numeric ID, or slug
 * - Loading state management
 * - Error handling
 * - Pool statistics feedback
 */

import { useState, useCallback } from "react";

interface DeleteResponse {
  success: boolean;
  message: string;
  documentId?: string;
  numericId?: number;
  poolStats?: {
    poolSize: number;
    maxSize: number;
    utilizationRate: number;
    totalRecycled: number;
  };
}

interface DeleteErrorState {
  message: string;
  code?: string;
}

/**
 * Hook for managing resume deletion
 *
 * @example
 * const { deleteResume, loading, error } = useResumeDelete();
 *
 * const handleDelete = async () => {
 *   const result = await deleteResume({
 *     method: 'numeric-id',
 *     value: 123456
 *   });
 *   if (result.success) {
 *     logger.info('Resume deleted, ID recycled:', result.numericId);
 *   }
 * };
 */
export const useResumeDelete = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DeleteErrorState | null>(null);

  const deleteResume = useCallback(async (options: {
    method: "document-id" | "numeric-id" | "slug";
    value: string | number;
    userId?: string;
  }): Promise<DeleteResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, any> = {
        userId: options.userId,
      };

      let url = "";
      const fetchOptions: RequestInit = {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (options.method === "document-id" || options.method === "numeric-id") {
        url = `/api/resumes/${options.value}`;
        // The API route DELETE /api/resumes/[id] handles both doc-id and stringified numeric-id
        fetchOptions.method = "DELETE";
      } else if (options.method === "slug") {
        // Since we migrated to numericIds = docIds, slug deletion is deprecated.
        // We throw or handle if necessary, but returning error for safety.
        throw new Error("Slug deletion is no longer supported. Use numeric-id.");
      }

      const response = await fetch(url, fetchOptions);

      const result: DeleteResponse = await response.json();

      if (!response.ok) {
        setError({
          message: result.message || "Failed to delete resume",
          code: response.status.toString(),
        });
        setLoading(false);
        return null;
      }

      setLoading(false);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete resume";
      setError({
        message: errorMessage,
        code: "NETWORK_ERROR",
      });
      setLoading(false);
      return null;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    deleteResume,
    loading,
    error,
    clearError,
  };
};

/**
 * Delete Resume Button Component
 *
 * A ready-to-use button component for resume deletion
 * with confirmation dialog
 *
 * Usage in client components:
 * import { DeleteResumeButton } from '@/hooks/useResumeDelete';
 *
 * <DeleteResumeButton
 *   resumeId={numericId}
 *   method="numeric-id"
 *   userId={currentUserId}
 *   onSuccess={(result) => {
 *     logger.info('Resume deleted, ID recycled');
 *     // refresh page or redirect
 *   }}
 * />
 */
export interface DeleteResumeButtonProps {
  resumeId: string | number;
  method?: "document-id" | "numeric-id" | "slug";
  userId?: string;
  onSuccess?: (result: DeleteResponse) => void;
  onError?: (error: DeleteErrorState) => void;
}
