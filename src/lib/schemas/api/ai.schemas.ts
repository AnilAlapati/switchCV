import { z } from "zod";

/**
 * Zod schema for AI generation request validation
 */
export const GenerateRequestSchema = z.object({
    prompt: z
        .string()
        .min(1, "Prompt is required")
        .max(2000, "Prompt exceeds maximum length of 2000 characters"),
    maxTokens: z
        .number()
        .int()
        .min(1, "maxTokens must be at least 1")
        .max(4000, "maxTokens cannot exceed 4000")
        .optional()
        .default(150),
    temperature: z
        .number()
        .min(0, "Temperature must be between 0 and 2")
        .max(2, "Temperature must be between 0 and 2")
        .optional(),
    task: z
        .enum(["creative", "balanced", "structured", "precise"])
        .optional()
        .default("creative"),
    role: z.enum(["jobseeker", "recruiter"]).optional().default("jobseeker"),
    skipCache: z.boolean().optional().default(false), // Allow bypassing semantic cache
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
