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

export const UpdateResumeRequestSchema = z.object({
  resume: z.object({
    title: z.string().min(1, "Title is required"),
    summary: z.string().optional(),
    experience: z
      .array(
        z.object({
          id: z.string().optional(),
          company: z.string().min(1),
          role: z.string().min(1),
          startDate: z.string().min(1),
          endDate: z.string().optional(),
          description: z.string().default(""),
          visibility: z.enum(["public", "masked", "request"]).default("public"),
        })
      )
      .optional(),
    education: z
      .array(
        z.object({
          id: z.string().optional(),
          institution: z.string().min(1),
          degree: z.string().min(1),
          startDate: z.string().min(1),
          endDate: z.string().optional(),
          description: z.string().optional(),
          visibility: z.enum(["public", "masked", "request"]).default("public"),
        })
      )
      .optional(),
    skills: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          level: z.string().default("intermediate"),
          visibility: z.enum(["public", "masked", "request"]).default("public"),
        })
      )
      .optional(),
    projects: z
      .array(
        z.object({
          id: z.string().optional(),
          name: z.string().min(1),
          url: z.string().optional(),
          description: z.string().default(""),
          visibility: z.enum(["public", "masked", "request"]).default("public"),
        })
      )
      .optional(),
    contact: z
      .object({
        email: z.object({
          value: z.string().default(""),
          visibility: z.enum(["public", "masked", "request"]),
        }),
        phone: z
          .object({
            value: z.string().default(""),
            visibility: z.enum(["public", "masked", "request"]),
          })
          .optional(),
      })
      .optional(),
    personalInfo: z
      .object({
        name: z.string().optional(),
        title: z.string().optional(),
        location: z.string().optional(),
        linkedin: z.string().url().optional().or(z.literal("")),
        github: z.string().url().optional().or(z.literal("")),
      })
      .optional(),
  }),
});
