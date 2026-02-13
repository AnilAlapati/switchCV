import { z } from "zod";

export const notificationActionSchema = z.enum([
  "send",
  "mark-read",
  "mark-all-read",
  "delete",
  "get-preferences",
  "update-preference",
  "get-delivery-status",
]);

export const notificationRequestSchema = z.object({
  action: notificationActionSchema,
  userId: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type NotificationRequest = z.infer<typeof notificationRequestSchema>;
