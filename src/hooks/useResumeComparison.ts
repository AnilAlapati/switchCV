/**
 * useResumeComparison Hook
 * Manages comparison state and operations
 */

"use client";

import { useState, useCallback } from "react";
import { Resume, ComparisonResult } from "@/lib/resumeComparison.types";
import { compareResumes } from "@/lib/resumeComparison";

interface UseResumeComparisonState {
  loading: boolean;
  error: string | null;
  comparison: ComparisonResult | null;
}

export function useResumeComparison() {
  const [state, setState] = useState<UseResumeComparisonState>({
    loading: false,
    error: null,
    comparison: null,
  });

  const compare = useCallback(async (resume1: Resume, resume2: Resume) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = compareResumes(resume1, resume2);
      setState({ loading: false, error: null, comparison: result });
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Comparison failed";
      setState({ loading: false, error: errorMessage, comparison: null });
      throw err;
    }
  }, []);

  const clearComparison = useCallback(() => {
    setState({ loading: false, error: null, comparison: null });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    compare,
    clearComparison,
    clearError,
  };
}
