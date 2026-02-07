import { z } from "zod";

export const AiSearchRequestSchema = z
  .object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict();
