import { z } from "zod";
import {
  AdminDurationSchema,
  EmailSchema,
  ResumeIdSchema,
  UserIdSchema,
} from "./shared.schemas";

export const RequestRecruiterContactSchema = z
  .object({
    recruiterId: UserIdSchema,
    recruiterName: z.string().min(1).max(200).optional(),
    recruiterEmail: EmailSchema.optional(),
    companyName: z.string().min(1).max(200).optional(),
    userId: UserIdSchema,
    resumeId: ResumeIdSchema,
    requestedFields: z.array(z.string().min(1)).min(1).max(4),
    purpose: z.string().min(1).max(2000).optional(),
    proposedDuration: AdminDurationSchema.optional(),
    ipAddress: z.string().max(120).optional(),
    userAgent: z.string().max(1000).optional(),
  })
  .strict();

export const GetRecruiterContactRequestsQuerySchema = z.object({
  recruiterId: UserIdSchema,
});

export const ApproveRecruiterContactSchema = z
  .object({
    requestId: z.string().min(1),
    duration: AdminDurationSchema.optional(),
    adminUserId: UserIdSchema,
    ipAddress: z.string().max(120).optional(),
    userAgent: z.string().max(1000).optional(),
  })
  .strict();

export const DenyRecruiterContactSchema = z
  .object({
    requestId: z.string().min(1),
    reason: z.string().min(1).max(5000),
    adminUserId: UserIdSchema,
  })
  .strict();

export const VerifyRecruiterTokenSchema = z
  .object({
    token: z.string().min(1).optional(),
    tokenId: z.string().min(1).optional(),
    recruiterId: UserIdSchema.optional(),
    ipAddress: z.string().max(120).optional(),
  })
  .strict()
  .refine((payload) => Boolean(payload.token || payload.tokenId), {
    message: "Token or tokenId is required",
  });
