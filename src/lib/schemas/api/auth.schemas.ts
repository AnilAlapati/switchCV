import { z } from "zod";
import { EmailSchema } from "./shared.schemas";
import { AUTH } from "@/config/constants";

/**
 * Password schema enforcing minimum length from AUTH config
 * and complexity requirements (uppercase, lowercase, digit).
 * Aligned with NIST 800-63B recommendations.
 */
export const PasswordSchema = z
  .string()
  .min(
    AUTH.PASSWORD_MIN_LENGTH,
    `Password must be at least ${AUTH.PASSWORD_MIN_LENGTH} characters`,
  )
  .max(
    AUTH.PASSWORD_MAX_LENGTH,
    `Password must be at most ${AUTH.PASSWORD_MAX_LENGTH} characters`,
  )
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit");

export const RequestPasswordResetSchema = z
  .object({
    email: EmailSchema,
  })
  .strict();

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: PasswordSchema,
  })
  .strict();
