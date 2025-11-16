// src/hooks/useResumeEnhancer.ts
/**
 * React Hook for Resume Enhancement
 * Manages ATS scoring, optimization tips, and keyword analysis
 */

import { useState, useCallback } from "react";
import type { ResumeProfile } from "@/lib/resumeGenerator";
import type { ResumeEnhancementResult } from "@/lib/resumeEnhancer";
import { logger } from "@/lib/logger";

interface UseResumeEnhancerState {
  loading: boolean;
  error: string | null;
  enhancement: ResumeEnhancementResult | null;
}

export const useResumeEnhancer = () => {
  const [state, setState] = useState<UseResumeEnhancerState>({
    loading: false,
    error: null,
    enhancement: null,
  });

  const enhance = useCallback(
    async (resume: ResumeProfile, jobDescription?: string) => {
      setState({ loading: true, error: null, enhancement: null });

      try {
        const response = await fetch("/api/resume/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume, jobDescription }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to enhance resume");
        }

        const enhancement = (await response.json()) as ResumeEnhancementResult;
        setState({ loading: false, error: null, enhancement });

        return enhancement;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Error enhancing resume:", error);
        setState({ loading: false, error: errorMessage, enhancement: null });
        throw error;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, enhancement: null });
  }, []);

  return {
    ...state,
    enhance,
    clearError,
    reset,
  };
};
