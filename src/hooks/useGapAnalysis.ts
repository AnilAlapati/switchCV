/**
 * useGapAnalysis Hook
 * Manages gap analysis state and reports
 */

"use client";

import { useState, useCallback } from "react";
import {
  SkillInventory,
  JobPosting,
  GapAnalysisReport,
} from "@/lib/skillMatrix.types";
import { performGapAnalysis, compareJobFit } from "@/lib/gapAnalysis";

interface UseGapAnalysisState {
  currentReport: GapAnalysisReport | null;
  reports: GapAnalysisReport[];
  jobComparisons: Array<{ job: JobPosting; report: GapAnalysisReport }>;
  loading: boolean;
  error: string | null;
}

export function useGapAnalysis() {
  const [state, setState] = useState<UseGapAnalysisState>({
    currentReport: null,
    reports: [],
    jobComparisons: [],
    loading: false,
    error: null,
  });

  const analyzeJob = useCallback(
    (inventory: SkillInventory, jobPosting: JobPosting) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const report = performGapAnalysis(inventory, jobPosting);
        setState((prev) => ({
          ...prev,
          currentReport: report,
          reports: [...prev.reports, report],
          loading: false,
        }));
        return report;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Analysis failed",
          loading: false,
        }));
        return null;
      }
    },
    []
  );

  const compareJobs = useCallback(
    (inventory: SkillInventory, jobs: JobPosting[]) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const comparisons = compareJobFit(inventory, jobs);
        setState((prev) => ({
          ...prev,
          jobComparisons: comparisons,
          loading: false,
        }));
        return comparisons;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Comparison failed",
          loading: false,
        }));
        return [];
      }
    },
    []
  );

  const clearReport = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentReport: null,
      error: null,
    }));
  }, []);

  const clearReports = useCallback(() => {
    setState((prev) => ({
      ...prev,
      reports: [],
      currentReport: null,
      error: null,
    }));
  }, []);

  return {
    currentReport: state.currentReport,
    reports: state.reports,
    jobComparisons: state.jobComparisons,
    loading: state.loading,
    error: state.error,
    analyzeJob,
    compareJobs,
    clearReport,
    clearReports,
  };
}
