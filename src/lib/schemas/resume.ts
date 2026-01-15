import { z } from "zod";

export const SkillSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  level: z.string().optional(),
});

export const ResumeSchema = z.object({
  title: z.string().default("Untitled Resume"),
  userId: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.union([z.string(), SkillSchema])).default([]),
  experience: z.array(z.object({
    id: z.string().optional(),
    company: z.string(),
    role: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string(),
    visibility: z.enum(["public", "masked", "request"]).default("public"),
  })).default([]),
  education: z.array(z.object({
    id: z.string().optional(),
    institution: z.string(),
    degree: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string().optional(),
    visibility: z.enum(["public", "masked", "request"]).default("public"),
  })).default([]),
  createdAt: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    if (arg && typeof arg === "object" && "toDate" in arg)
      return (arg as { toDate: () => Date }).toDate();
    return new Date();
  }, z.date()),
  updatedAt: z.preprocess((arg) => {
    if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    if (arg && typeof arg === "object" && "toDate" in arg)
      return (arg as { toDate: () => Date }).toDate();
    return new Date();
  }, z.date()),
  published: z.boolean().default(false),
});

export const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoURL: z.string().optional(),
  role: z.enum(["jobseeker", "recruiter", "admin"]).default("jobseeker"),
  subscriptionTier: z.enum(["basic", "premium", "enterprise"]).default("basic"),
});

export type Skill = z.infer<typeof SkillSchema>;
export type Resume = z.infer<typeof ResumeSchema>;
export type User = z.infer<typeof UserSchema>;
