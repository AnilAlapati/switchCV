import { z } from "zod";
import { EmailSchema } from "./shared.schemas";

export const RequestPasswordResetSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(6),
  })
  .strict();
