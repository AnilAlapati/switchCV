import { z } from "zod";
import { ResumeIdSchema, UserIdSchema } from "./shared.schemas";

const CandidatePrioritySchema = z.enum(["low", "medium", "high", "critical"]);
const BulkActionTypeSchema = z.enum([
  "move-stage",
  "update-priority",
  "send-email",
  "schedule-interview",
  "reject",
  "add-note",
]);
const CandidateNoteCategorySchema = z.enum([
  "general",
  "technical",
  "cultural-fit",
  "feedback",
  "follow-up",
]);
const PipelineStageSchema = z.enum([
  "lead",
  "screened",
  "shortlisted",
  "interviewed",
  "offered",
  "hired",
  "rejected",
  "on-hold",
]);
const InterviewTypeSchema = z.enum(["phone", "video", "in-person", "coding", "panel"]);
const InterviewStatusSchema = z.enum([
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
  "rescheduled",
]);

export const RequestRecruiterAccessSchema = z
  .object({
    resumeId: ResumeIdSchema,
    requestedFields: z.array(z.string().min(1).max(50)).optional(),
  })
  .strict();

export const CreateRecruiterCandidateSchema = z
  .object({
    action: z.literal("create"),
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    position: z.string().min(1).max(200),
    phone: z.string().max(50).optional(),
    resumeUrl: z.string().url().max(2000).optional(),
    source: z.string().max(200).optional(),
  })
  .strict();

export const UpdateRecruiterCandidatePrioritySchema = z
  .object({
    action: z.literal("update-priority"),
    candidateId: z.string().min(1),
    priority: CandidatePrioritySchema,
  })
  .strict();

export const AddRecruiterCandidateNoteSchema = z
  .object({
    action: z.literal("add-note"),
    candidateId: z.string().min(1),
    userId: UserIdSchema.optional(),
    content: z.string().min(1).max(5000),
    category: CandidateNoteCategorySchema.optional(),
    isPrivate: z.boolean().optional(),
  })
  .strict();

export const RecruiterCandidatesActionSchema = z.discriminatedUnion("action", [
  CreateRecruiterCandidateSchema,
  UpdateRecruiterCandidatePrioritySchema,
  AddRecruiterCandidateNoteSchema,
]);

export const CreateRecruiterBulkActionSchema = z
  .object({
    action: z.literal("create"),
    actionType: BulkActionTypeSchema,
    candidateIds: z.array(z.string().min(1)).min(1).max(200),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const ExecuteRecruiterBulkActionSchema = z
  .object({
    action: z.literal("execute"),
    bulkActionId: z.string().min(1),
  })
  .strict();

export const CancelRecruiterBulkActionSchema = z
  .object({
    action: z.literal("cancel"),
    bulkActionId: z.string().min(1),
  })
  .strict();

export const RecruiterBulkActionSchema = z.discriminatedUnion("action", [
  CreateRecruiterBulkActionSchema,
  ExecuteRecruiterBulkActionSchema,
  CancelRecruiterBulkActionSchema,
]);

export const ScheduleRecruiterInterviewSchema = z
  .object({
    action: z.literal("schedule"),
    candidateId: z.string().min(1),
    jobId: z.string().min(1),
    type: InterviewTypeSchema,
    scheduledTime: z.string().min(1),
    duration: z.number().int().min(1).max(720).default(60),
    interviewers: z.array(z.string().min(1)),
    location: z.string().max(1000).optional(),
    notes: z.string().max(10000).optional(),
  })
  .strict();

export const UpdateRecruiterInterviewStatusSchema = z
  .object({
    action: z.literal("update-status"),
    interviewId: z.string().min(1),
    status: InterviewStatusSchema,
  })
  .strict();

export const AddRecruiterInterviewFeedbackSchema = z
  .object({
    action: z.literal("add-feedback"),
    interviewId: z.string().min(1),
    feedback: z.record(z.string(), z.unknown()),
  })
  .strict();

export const GetUpcomingRecruiterInterviewsSchema = z
  .object({
    action: z.literal("get-upcoming"),
    days: z.number().int().min(1).max(365).optional(),
  })
  .strict();

export const RecruiterInterviewsActionSchema = z.discriminatedUnion("action", [
  ScheduleRecruiterInterviewSchema,
  UpdateRecruiterInterviewStatusSchema,
  AddRecruiterInterviewFeedbackSchema,
  GetUpcomingRecruiterInterviewsSchema,
]);

export const InitializeRecruiterPipelineSchema = z
  .object({
    action: z.literal("initialize"),
    jobId: z.string().min(1),
    jobTitle: z.string().min(1).max(200),
    recruiterId: UserIdSchema.optional(),
  })
  .strict();

export const AddRecruiterPipelineCandidateSchema = z
  .object({
    action: z.literal("add-candidate"),
    pipelineId: z.string().min(1),
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    position: z.string().min(1).max(200),
    phone: z.string().max(50).optional(),
    resumeUrl: z.string().url().max(2000).optional(),
  })
  .strict();

export const MoveRecruiterPipelineCandidateSchema = z
  .object({
    action: z.literal("move-candidate"),
    pipelineId: z.string().min(1),
    candidateId: z.string().min(1),
    newStage: PipelineStageSchema,
  })
  .strict();

export const GetRecruiterPipelineStageSchema = z
  .object({
    action: z.literal("get-stage"),
    pipelineId: z.string().min(1),
    stage: PipelineStageSchema,
  })
  .strict();

export const RecruiterPipelineActionSchema = z.discriminatedUnion("action", [
  InitializeRecruiterPipelineSchema,
  AddRecruiterPipelineCandidateSchema,
  MoveRecruiterPipelineCandidateSchema,
  GetRecruiterPipelineStageSchema,
]);
