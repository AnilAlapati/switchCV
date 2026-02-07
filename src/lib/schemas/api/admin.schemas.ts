import { z } from "zod";
import { UserIdSchema } from "./shared.schemas";

export const MigrateNumericIdsSchema = z
  .object({
    userId: UserIdSchema.optional(),
    migrateAll: z.boolean().optional(),
  })
  .strict();

export const UserApprovalActionSchema = z
  .object({
    approvalId: z.string().min(1),
    action: z.enum(["approve", "reject"]),
    reason: z.string().max(5000).optional(),
  })
  .strict();
