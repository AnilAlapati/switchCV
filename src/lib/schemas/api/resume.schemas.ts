import { z } from "zod";
import { ResumeIdSchema } from "./shared.schemas";

const ResumeComparisonRecordSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    skills: z.array(z.string()),
    experience: z.array(z.unknown()),
    education: z.array(z.unknown()),
  })
  .passthrough();

const ConversationHistoryItemSchema = z
  .object({
    id: z.string().optional(),
    content: z.string(),
    isUser: z.boolean(),
    timestamp: z.string().optional(),
  })
  .passthrough();

const ResumeChatConversationItemSchema = z
  .object({
    id: z.string().optional(),
    content: z.string(),
    isUser: z.boolean(),
    timestamp: z.string().optional(),
  })
  .passthrough();

export const DeleteResumeSchema = z
  .object({
    resumeId: ResumeIdSchema,
  })
  .strict();

export const MapResumeIdSchema = z
  .object({
    resumeId: ResumeIdSchema,
    documentId: z.string().min(1),
  })
  .strict();

export const CompareResumesSchema = z
  .object({
    resume1: ResumeComparisonRecordSchema,
    resume2: ResumeComparisonRecordSchema,
  })
  .strict();

export const GenerateResumeRequestSchema = z
  .object({
    message: z.string().min(1),
    conversationHistory: z.array(ConversationHistoryItemSchema).optional().default([]),
    sessionData: z.record(z.string(), z.unknown()).optional(),
    modelId: z.string().min(1).optional(),
    async: z.boolean().optional(),
  })
  .passthrough();

export const CreateResumeSchema = z
  .object({
    userId: z.string().min(1),
    resume: z.record(z.string(), z.unknown()),
    isPublic: z.boolean().optional(),
  })
  .strict();

export const ResumeChatRequestSchema = z
  .object({
    message: z.string().min(1),
    conversationHistory: z.array(ResumeChatConversationItemSchema).optional().default([]),
    sessionData: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
