import { z } from "zod";

export const UserRoleSchema = z
  .object({
    role: z.enum(["jobseeker", "recruiter"]),
  })
  .strict();

export const UserProfileQuerySchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

export const CreateUserProfileSchema = z
  .object({
    uid: z.string().min(1),
    email: z.string().min(1),
  })
  .passthrough();

export const UpdateUserProfileSchema = z
  .object({
    uid: z.string().min(1),
  })
  .passthrough();

export const UserSettingsQuerySchema = z
  .object({
    userId: z.string().min(1),
  })
  .strict();

export const UserSettingsUpdateSchema = z
  .object({
    userId: z.string().min(1),
    isRecruiter: z.boolean().optional(),
    companyName: z.string().optional().nullable(),
    displayName: z.string().optional().nullable(),
    notifications: z.record(z.string(), z.unknown()).optional(),
    privacy: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
