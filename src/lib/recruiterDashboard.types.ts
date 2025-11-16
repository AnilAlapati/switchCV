/**
 * Recruiter Dashboard Pipeline Types
 * Definitions for Kanban pipeline, candidates, notes, and scheduling
 */

/**
 * Pipeline stage status
 */
export enum PipelineStage {
  LEAD = "lead",
  SCREENED = "screened",
  SHORTLISTED = "shortlisted",
  INTERVIEWED = "interviewed",
  OFFERED = "offered",
  HIRED = "hired",
  REJECTED = "rejected",
  ON_HOLD = "on-hold",
}

/**
 * Candidate priority level
 */
export enum CandidatePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Interview type
 */
export enum InterviewType {
  PHONE = "phone",
  VIDEO = "video",
  IN_PERSON = "in-person",
  CODING = "coding",
  PANEL = "panel",
}

/**
 * Interview status
 */
export enum InterviewStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  NO_SHOW = "no-show",
  RESCHEDULED = "rescheduled",
}

/**
 * Feedback rating
 */
export enum FeedbackRating {
  POOR = "poor",
  FAIR = "fair",
  GOOD = "good",
  EXCELLENT = "excellent",
}

/**
 * Candidate information
 */
export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  stage: PipelineStage;
  priority: CandidatePriority;
  resumeUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  skillMatch?: number; // 0-100 from skill matrix feature
  createdAt: Date;
  updatedAt: Date;
  source?: string; // Where candidate came from
  appliedDate?: Date;
}

/**
 * Candidate note/comment
 */
export interface CandidateNote {
  id: string;
  candidateId: string;
  userId: string; // Who created the note
  content: string;
  category?:
    | "general"
    | "technical"
    | "cultural-fit"
    | "feedback"
    | "follow-up";
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  attachmentUrl?: string;
}

/**
 * Interview feedback
 */
export interface InterviewFeedback {
  id: string;
  interviewId: string;
  candidateId: string;
  interviewerId: string;
  interviewType: InterviewType;
  rating: FeedbackRating;
  technicalScore?: number; // 0-100
  communicationScore?: number; // 0-100
  culturalFitScore?: number; // 0-100
  overallScore?: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  comments: string;
  recommendation: "move-forward" | "reject" | "hold" | "revisit";
  createdAt: Date;
}

/**
 * Interview scheduling
 */
export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  interviewType: InterviewType;
  scheduledTime: Date;
  duration: number; // in minutes
  interviewers: string[]; // User IDs
  status: InterviewStatus;
  meetingLink?: string;
  notes?: string;
  feedback?: InterviewFeedback;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job opening for recruitment
 */
export interface JobOpening {
  id: string;
  title: string;
  description: string;
  department: string;
  requiredSkills: string[];
  location?: string;
  salary?: {
    min: number;
    max: number;
  };
  openPositions: number;
  status: "open" | "closed" | "on-hold";
  createdAt: Date;
  closedDate?: Date;
}

/**
 * Pipeline stage with candidates
 */
export interface PipelineColumn {
  stage: PipelineStage;
  candidates: Candidate[];
  count: number;
  stageOrder: number;
}

/**
 * Complete recruitment pipeline
 */
export interface RecruitmentPipeline {
  id: string;
  jobId: string;
  jobTitle: string;
  columns: PipelineColumn[];
  totalCandidates: number;
  conversionRates?: {
    stage: PipelineStage;
    rate: number; // Percentage to next stage
  }[];
}

/**
 * Bulk action for multiple candidates
 */
export interface BulkAction {
  id: string;
  actionType:
    | "move-stage"
    | "update-priority"
    | "send-email"
    | "schedule-interview"
    | "reject"
    | "add-note";
  targetStage?: PipelineStage;
  targetPriority?: CandidatePriority;
  candidateIds: string[];
  noteContent?: string;
  interviewType?: InterviewType;
  interviewTime?: Date;
  templateId?: string; // For email templates
  executedAt?: Date;
  executedBy?: string;
  status: "pending" | "executing" | "completed" | "failed";
  result?: {
    successCount: number;
    failCount: number;
    errors?: string[];
  };
}

/**
 * Candidate communication history
 */
export interface CommunicationLog {
  id: string;
  candidateId: string;
  type: "email" | "phone" | "interview" | "note" | "offer";
  subject?: string;
  content?: string;
  sentBy?: string;
  sentAt: Date;
  status: "sent" | "opened" | "failed" | "scheduled";
  attachments?: string[];
}

/**
 * Dashboard metrics and analytics
 */
export interface PipelineMetrics {
  totalCandidates: number;
  stageDistribution: Record<PipelineStage, number>;
  timeInStage: Record<PipelineStage, number>; // in days
  conversionRate: number; // 0-100
  averageTimeToHire: number; // in days
  hiredThisMonth: number;
  activeInterviews: number;
  pendingFollowUps: number;
}

/**
 * Candidate comparison for evaluation
 */
export interface CandidateComparison {
  candidates: Candidate[];
  skillMatches: Record<string, number>; // candidateId -> match %
  averageScores: Record<string, number>; // metric -> score
  strengths: {
    candidateId: string;
    advantages: string[];
  }[];
  recommendation: string;
}

/**
 * Interview schedule request
 */
export interface ScheduleInterviewRequest {
  candidateId: string;
  jobId: string;
  interviewType: InterviewType;
  preferredDates: Date[];
  duration: number;
  interviewers: string[];
  description?: string;
  meetingLink?: string;
}

/**
 * Bulk candidate import
 */
export interface BulkCandidateImport {
  jobId: string;
  candidates: Array<{
    name: string;
    email: string;
    phone?: string;
    resumeUrl?: string;
    position?: string;
    source?: string;
  }>;
  source: "csv" | "json" | "api" | "manual";
  importedBy: string;
  importedAt: Date;
}

/**
 * API Request/Response types
 */
export interface UpdateCandidateStageRequest {
  candidateId: string;
  newStage: PipelineStage;
}

export interface AddCandidateNoteRequest {
  candidateId: string;
  content: string;
  category?: string;
  isPrivate?: boolean;
}

export interface CreateInterviewRequest {
  candidateId: string;
  jobId: string;
  interviewType: InterviewType;
  scheduledTime: Date;
  duration: number;
  interviewers: string[];
  meetingLink?: string;
}

export interface BulkActionRequest {
  actionType: string;
  candidateIds: string[];
  newStage?: PipelineStage;
  newPriority?: CandidatePriority;
  interviewType?: InterviewType;
  interviewTime?: Date;
  noteContent?: string;
}

export interface GetPipelineMetricsRequest {
  jobId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Notification types for recruiter actions
 */
export interface RecruitmentNotification {
  id: string;
  type:
    | "interview-scheduled"
    | "candidate-moved"
    | "feedback-received"
    | "follow-up-needed"
    | "offer-sent";
  message: string;
  candidateId?: string;
  jobId?: string;
  read: boolean;
  createdAt: Date;
}
