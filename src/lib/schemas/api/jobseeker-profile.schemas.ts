import { z } from "zod";

/**
 * Strict schema for jobseeker profile updates.
 * Prevents unauthorized field persistence (Rule 3 Hardening).
 */
export const JobseekerProfileSchema = z.object({
    displayName: z.string().max(100).optional(),
    bio: z.string().max(2000).optional(),
    location: z.string().max(120).optional(),
    skills: z.array(z.string().max(50)).max(20).optional(),
    experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
    preferences: z.object({
        jobTypes: z.array(z.string()).optional(),
        locations: z.array(z.string()).optional(),
        minSalary: z.number().min(0).optional(),
        remote: z.boolean().optional(),
    }).optional(),
    updatedAt: z.string().optional(),
}).strict();

export type JobseekerProfileUpdate = z.infer<typeof JobseekerProfileSchema>;
