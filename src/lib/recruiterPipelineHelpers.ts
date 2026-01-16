/**
 * Recruitment Pipeline Helpers
 * Utility functions for pipeline analytics, comparisons, and utilities
 */

import {
  RecruitmentPipeline,
  PipelineStage,
  Candidate,
  CandidateComparison,
  BulkAction,
  CommunicationLog,
  PipelineColumn,
} from "./recruiterDashboard.types";

/**
 * Initialize recruitment pipeline for a job
 */
export function initializePipeline(
  jobId: string,
  jobTitle: string
): RecruitmentPipeline {
  const stages: PipelineColumn[] = [
    { stage: PipelineStage.LEAD, candidates: [], count: 0, stageOrder: 1 },
    { stage: PipelineStage.SCREENED, candidates: [], count: 0, stageOrder: 2 },
    {
      stage: PipelineStage.SHORTLISTED,
      candidates: [],
      count: 0,
      stageOrder: 3,
    },
    {
      stage: PipelineStage.INTERVIEWED,
      candidates: [],
      count: 0,
      stageOrder: 4,
    },
    { stage: PipelineStage.OFFERED, candidates: [], count: 0, stageOrder: 5 },
    { stage: PipelineStage.HIRED, candidates: [], count: 0, stageOrder: 6 },
  ];

  return {
    id: generatePipelineId(),
    jobId,
    jobTitle,
    columns: stages,
    totalCandidates: 0,
  };
}

/**
 * Add candidate to pipeline
 */
export function addCandidateToPipeline(
  pipeline: RecruitmentPipeline,
  candidate: Candidate
): RecruitmentPipeline {
  const columnIndex = pipeline.columns.findIndex(
    (col) => col.stage === candidate.stage
  );

  if (columnIndex === -1) {
    throw new Error(`Invalid pipeline stage: ${candidate.stage}`);
  }

  const updatedColumns = [...pipeline.columns];
  updatedColumns[columnIndex] = {
    ...updatedColumns[columnIndex],
    candidates: [...updatedColumns[columnIndex].candidates, candidate],
    count: updatedColumns[columnIndex].count + 1,
  };

  return {
    ...pipeline,
    columns: updatedColumns,
    totalCandidates: pipeline.totalCandidates + 1,
  };
}

/**
 * Move candidate within pipeline
 */
export function moveCandidateInPipeline(
  pipeline: RecruitmentPipeline,
  candidate: Candidate,
  newStage: PipelineStage
): RecruitmentPipeline {
  // Remove from current stage
  let updatedColumns = pipeline.columns.map((col) => {
    if (col.stage === candidate.stage) {
      return {
        ...col,
        candidates: col.candidates.filter((c) => c.id !== candidate.id),
        count: col.count - 1,
      };
    }
    return col;
  });

  // Add to new stage
  updatedColumns = updatedColumns.map((col) => {
    if (col.stage === newStage) {
      const movedCandidate = {
        ...candidate,
        stage: newStage,
        updatedAt: new Date(),
      };
      return {
        ...col,
        candidates: [...col.candidates, movedCandidate],
        count: col.count + 1,
      };
    }
    return col;
  });

  return {
    ...pipeline,
    columns: updatedColumns,
  };
}

/**
 * Calculate average time in each stage
 */
export function calculateTimeInStage(
  pipeline: RecruitmentPipeline
): Record<PipelineStage, number> {
  const timeInStage: Record<PipelineStage, number> = {} as Record<PipelineStage, number>;

  pipeline.columns.forEach((col) => {
    const times = col.candidates
      .map((c) => {
        const daysInStage = Math.floor(
          (new Date().getTime() - new Date(c.updatedAt).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        return daysInStage;
      })
      .filter((t) => t > 0);

    const avgTime =
      times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : 0;

    timeInStage[col.stage] = avgTime;
  });

  return timeInStage;
}

/**
 * Calculate average time to hire
 */
export function calculateAverageTimeToHire(
  pipeline: RecruitmentPipeline
): number {
  const hiredCandidates =
    pipeline.columns.find((col) => col.stage === PipelineStage.HIRED)
      ?.candidates || [];

  if (hiredCandidates.length === 0) return 0;

  const times = hiredCandidates.map((c) => {
    const daysToHire = Math.floor(
      (new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    return daysToHire;
  });

  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  return avgTime;
}

/**
 * Get hired this month
 */
export function getHiredThisMonth(pipeline: RecruitmentPipeline): number {
  const hiredCandidates =
    pipeline.columns.find((col) => col.stage === PipelineStage.HIRED)
      ?.candidates || [];

  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

  return hiredCandidates.filter((c) => new Date(c.updatedAt) >= monthAgo)
    .length;
}

/**
 * Get pending follow-ups
 */
export function getPendingFollowUps(
  pipeline: RecruitmentPipeline
): Candidate[] {
  const screened =
    pipeline.columns.find((col) => col.stage === PipelineStage.SCREENED)
      ?.candidates || [];

  const interviewed =
    pipeline.columns.find((col) => col.stage === PipelineStage.INTERVIEWED)
      ?.candidates || [];

  return [...screened, ...interviewed];
}

/**
 * Compare candidates side by side
 */
export function compareCandidates(
  candidates: Candidate[]
): CandidateComparison {
  const skillMatches: Record<string, number> = {};
  const scoreSum: Record<string, number> = {};

  candidates.forEach((c) => {
    skillMatches[c.id] = c.skillMatch || 0;
    scoreSum[c.id] = (c.skillMatch || 0) / candidates.length;
  });

  const recommendation =
    candidates.length > 0
      ? `Top candidate: ${candidates.reduce((prev, current) =>
        (prev.skillMatch || 0) > (current.skillMatch || 0) ? prev : current
      ).name
      }`
      : "No candidates to compare";

  return {
    candidates,
    skillMatches,
    averageScores: scoreSum,
    strengths: candidates.map((c) => ({
      candidateId: c.id,
      advantages: [
        `Priority: ${c.priority}`,
        `Skill Match: ${c.skillMatch || 0}%`,
      ],
    })),
    recommendation,
  };
}

/**
 * Create bulk action
 */
export function createBulkAction(
  actionType: string,
  candidateIds: string[]
): BulkAction {
  return {
    id: generateBulkActionId(),
    actionType: (actionType === "move" ? "move-stage" :
      actionType === "priority" ? "update-priority" :
        actionType === "note" ? "add-note" : actionType) as
      | "move-stage"
      | "update-priority"
      | "send-email"
      | "schedule-interview"
      | "reject"
      | "add-note",
    candidateIds,
    status: "pending",
  };
}

/**
 * Get candidate communication history
 */
export function getCommunicationHistory(
  logs: CommunicationLog[],
  candidateId: string
): CommunicationLog[] {
  return logs
    .filter((log) => log.candidateId === candidateId)
    .sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
}

/**
 * Generate unique ID utilities
 */
export function generateCandidateId(): string {
  return `cand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generatePipelineId(): string {
  return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateInterviewId(): string {
  return `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBulkActionId(): string {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
