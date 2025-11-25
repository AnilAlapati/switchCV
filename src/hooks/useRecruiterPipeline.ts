/**
 * useRecruiterPipeline Hook
 * State management for pipeline operations and candidate management
 */

import { useState, useCallback } from "react";
import {
  Candidate,
  RecruitmentPipeline,
  PipelineStage,
  CandidatePriority,
} from "@/lib/recruiterDashboard.types";
import {
  createCandidate,
  updateCandidatePriority,
  addCandidateNote,
  getCandidatesByStage,
  searchCandidatesInPipeline,
  calculatePipelineMetrics,
} from "@/lib/recruiterPipeline";
import {
  initializePipeline,
  addCandidateToPipeline,
  moveCandidateInPipeline,
} from "@/lib/recruiterPipelineHelpers";

interface UseRecruiterPipelineReturn {
  pipeline: RecruitmentPipeline | null;
  loading: boolean;
  error: string | null;
  initialize: (jobId: string, jobTitle: string) => void;
  addCandidate: (
    name: string,
    email: string,
    position: string,
    phone?: string
  ) => void;
  moveCandidate: (candidateId: string, newStage: PipelineStage) => void;
  updatePriority: (candidateId: string, priority: CandidatePriority) => void;
  addNote: (candidateId: string, content: string, category: string) => void;
  getCandidates: (stage: PipelineStage) => Candidate[];
  searchCandidates: (query: string) => Candidate[];
  getMetrics: () => ReturnType<typeof calculatePipelineMetrics>;
}

/**
 * Hook for managing recruitment pipeline state and operations
 */
export function useRecruiterPipeline(): UseRecruiterPipelineReturn {
  const [pipeline, setPipeline] = useState<RecruitmentPipeline | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback((jobId: string, jobTitle: string) => {
    try {
      setLoading(true);
      const newPipeline = initializePipeline(jobId, jobTitle);
      setPipeline(newPipeline);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize pipeline"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const addCandidate = useCallback(
    (name: string, email: string, position: string, phone?: string) => {
      try {
        if (!pipeline) throw new Error("Pipeline not initialized");
        setLoading(true);

        const candidate = createCandidate(name, email, position, phone);
        const updatedPipeline = addCandidateToPipeline(pipeline, candidate);
        setPipeline(updatedPipeline);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add candidate"
        );
      } finally {
        setLoading(false);
      }
    },
    [pipeline]
  );

  const moveCandidate = useCallback(
    (candidateId: string, newStage: PipelineStage) => {
      try {
        if (!pipeline) throw new Error("Pipeline not initialized");
        setLoading(true);

        const candidate = pipeline.columns
          .flatMap((col) => col.candidates)
          .find((c) => c.id === candidateId);

        if (!candidate) throw new Error("Candidate not found");

        const updatedPipeline = moveCandidateInPipeline(
          pipeline,
          candidate,
          newStage
        );
        setPipeline(updatedPipeline);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to move candidate"
        );
      } finally {
        setLoading(false);
      }
    },
    [pipeline]
  );

  const updatePriority = useCallback(
    (candidateId: string, priority: CandidatePriority) => {
      try {
        if (!pipeline) throw new Error("Pipeline not initialized");
        setLoading(true);

        const updatedPipeline = {
          ...pipeline,
          columns: pipeline.columns.map((col) => ({
            ...col,
            candidates: col.candidates.map((c) =>
              c.id === candidateId ? updateCandidatePriority(c, priority) : c
            ),
          })),
        };
        setPipeline(updatedPipeline);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update priority"
        );
      } finally {
        setLoading(false);
      }
    },
    [pipeline]
  );

  const addNote = useCallback(
    (candidateId: string, content: string, category: string) => {
      try {
        if (!pipeline) throw new Error("Pipeline not initialized");
        setLoading(true);

        const candidate = pipeline.columns
          .flatMap((col) => col.candidates)
          .find((c) => c.id === candidateId);

        if (!candidate) throw new Error("Candidate not found");

        // Add note to candidate (tracked in separate notes collection in real app)
        addCandidateNote(candidateId, "user", content, category);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add note");
      } finally {
        setLoading(false);
      }
    },
    [pipeline]
  );

  const getCandidates = useCallback(
    (stage: PipelineStage) => {
      if (!pipeline) return [];
      return getCandidatesByStage(pipeline, stage);
    },
    [pipeline]
  );

  const searchCandidates = useCallback(
    (query: string) => {
      if (!pipeline) return [];
      return searchCandidatesInPipeline(pipeline, query);
    },
    [pipeline]
  );

  const getMetrics = useCallback(() => {
    if (!pipeline) {
      return {
        totalCandidates: 0,
        stageDistribution: {} as any,
        timeInStage: {} as any,
        conversionRate: 0,
        averageTimeToHire: 0,
        hiredThisMonth: 0,
        activeInterviews: 0,
        pendingFollowUps: 0,
      };
    }
    return calculatePipelineMetrics(pipeline);
  }, [pipeline]);

  return {
    pipeline,
    loading,
    error,
    initialize,
    addCandidate,
    moveCandidate,
    updatePriority,
    addNote,
    getCandidates,
    searchCandidates,
    getMetrics,
  };
}
