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

"use client";

import { useState } from "react";

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
 *     console.log('Resume deleted, ID recycled:', result.numericId);
 *   }
 * };
 */
export const useResumeDelete = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DeleteErrorState | null>(null);

  const deleteResume = async (options: {
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

      const url = "/api/resumes/delete";
      let method = "POST";

      if (options.method === "document-id") {
        body.resumeDocumentId = options.value;
        method = "POST";
      } else if (options.method === "numeric-id") {
        body.numericId = options.value;
        method = "DELETE";
      } else if (options.method === "slug") {
        body.slug = options.value;
        method = "POST";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

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
  };

  const clearError = () => setError(null);

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
 *     console.log('Resume deleted, ID recycled');
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
