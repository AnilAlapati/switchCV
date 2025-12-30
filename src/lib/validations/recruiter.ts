import { z } from "zod";

export const searchResumesSchema = z.object({
  recruiterId: z.string(),
  userId: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
});

export type SearchResumesInput = z.infer<typeof searchResumesSchema>;
