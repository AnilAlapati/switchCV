import { z } from "zod";

export const DurationSchema = z.enum(["1hour", "1day", "1week", "forever"]);
export const AdminDurationSchema = z.enum(["1hour", "1day", "1week", "30days"]);

export const DurationPresetSchema = z.enum([
  "1_hour",
  "1_day",
  "1_week",
  "1_month",
  "custom_days",
]);

export const DurationSelectionSchema = z
  .object({
    preset: DurationPresetSchema,
    customDays: z.number().int().min(1).max(365).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.preset === "custom_days" && value.customDays === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customDays"],
        message: "customDays is required when preset is custom_days",
      });
    }
  });

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
  cursor: z.string().min(1).optional(),
});

export const ResumeIdSchema = z.union([z.string().min(1), z.number()]);
export const UserIdSchema = z.string().min(1);
export const RequestIdSchema = z.string().min(1);
export const EmailSchema = z.string().email().max(254);
