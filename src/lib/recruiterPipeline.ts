/**
 * Recruitment Pipeline Manager
 * Core functions for candidate lifecycle and pipeline operations
 */

import {
  Candidate,
  CandidateNote,
  Interview,
  PipelineStage,
  CandidatePriority,
  RecruitmentPipeline,
  PipelineMetrics,
  InterviewType,
  InterviewStatus,
} from "./recruiterDashboard.types";
import {
  generateCandidateId,
  generateNoteId,
  generateInterviewId,
  calculateTimeInStage,
  calculateAverageTimeToHire,
  getHiredThisMonth,
  getPendingFollowUps,
} from "./recruiterPipelineHelpers";

/**
 * Create a new candidate in the pipeline
 */
export function createCandidate(
  name: string,
  email: string,
  position: string,
  phone?: string,
  resumeUrl?: string,
  source?: string
): Candidate {
  return {
    id: generateCandidateId(),
    name,
    email,
    phone,
    position,
    stage: PipelineStage.LEAD,
    priority: CandidatePriority.MEDIUM,
    resumeUrl,
    source,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Move candidate to different stage
 */
export function moveCandidateStage(
  candidate: Candidate,
  newStage: PipelineStage
): Candidate {
  return {
    ...candidate,
    stage: newStage,
    updatedAt: new Date(),
  };
}

/**
 * Update candidate priority
 */
export function updateCandidatePriority(
  candidate: Candidate,
  newPriority: CandidatePriority
): Candidate {
  return {
    ...candidate,
    priority: newPriority,
    updatedAt: new Date(),
  };
}

/**
 * Add note to candidate
 */
export function addCandidateNote(
  candidateId: string,
  userId: string,
  content: string,
  category?: string,
  isPrivate: boolean = false
): CandidateNote {
  return {
    id: generateNoteId(),
    candidateId,
    userId,
    content,
    category: (category as "general" | "technical" | "cultural-fit" | "feedback" | "follow-up") || "general",
    isPrivate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get candidates by stage
 */
export function getCandidatesByStage(
  pipeline: RecruitmentPipeline,
  stage: PipelineStage
): Candidate[] {
  const column = pipeline.columns.find((col) => col.stage === stage);
  return column?.candidates || [];
}

/**
 * Get candidates by priority
 */
export function getCandidatesByPriority(
  pipeline: RecruitmentPipeline,
  priority: CandidatePriority
): Candidate[] {
  return pipeline.columns
    .flatMap((col) => col.candidates)
    .filter((c) => c.priority === priority);
}

/**
 * Search candidates in pipeline
 */
export function searchCandidatesInPipeline(
  pipeline: RecruitmentPipeline,
  query: string
): Candidate[] {
  const lowerQuery = query.toLowerCase();
  return pipeline.columns
    .flatMap((col) => col.candidates)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery) ||
        c.position.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Schedule interview for candidate
 */
export function scheduleInterview(
  candidateId: string,
  jobId: string,
  interviewType: InterviewType,
  scheduledTime: Date,
  duration: number,
  interviewers: string[]
): Interview {
  return {
    id: generateInterviewId(),
    candidateId,
    jobId,
    interviewType,
    scheduledTime,
    duration,
    interviewers,
    status: InterviewStatus.SCHEDULED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get upcoming interviews
 */
export function getUpcomingInterviews(
  interviews: Interview[],
  days: number = 7
): Interview[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return interviews.filter((interview) => {
    const time = new Date(interview.scheduledTime);
    return (
      time >= now &&
      time <= futureDate &&
      interview.status === InterviewStatus.SCHEDULED
    );
  });
}

/**
 * Calculate pipeline metrics
 */
export function calculatePipelineMetrics(
  pipeline: RecruitmentPipeline
): PipelineMetrics {
  const stageDistribution: Record<PipelineStage, number> = {} as Record<PipelineStage, number>;
  let hiredCount = 0;

  pipeline.columns.forEach((col) => {
    stageDistribution[col.stage] = col.count;
    if (col.stage === PipelineStage.HIRED) {
      hiredCount = col.count;
    }
  });

  const conversionRate =
    pipeline.totalCandidates > 0
      ? (hiredCount / pipeline.totalCandidates) * 100
      : 0;

  return {
    totalCandidates: pipeline.totalCandidates,
    stageDistribution,
    timeInStage: calculateTimeInStage(pipeline),
    conversionRate: Math.round(conversionRate),
    averageTimeToHire: calculateAverageTimeToHire(pipeline),
    hiredThisMonth: getHiredThisMonth(pipeline),
    activeInterviews: 0,
    pendingFollowUps: getPendingFollowUps(pipeline).length,
  };
}
