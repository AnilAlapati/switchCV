import { z } from "zod";
import { UserIdSchema } from "./shared.schemas";

export const DashboardAnalyticsRequestSchema = z
  .object({
    resumeId: z.string().min(1),
    userId: UserIdSchema.optional(),
  })
  .strict();

export const DashboardAnalyticsQuerySchema = z
  .object({
    resumeId: z.string().min(1),
    userId: UserIdSchema.optional(),
  })
  .strict();
