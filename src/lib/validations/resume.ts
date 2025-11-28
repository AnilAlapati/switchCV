import { z } from "zod";

const visibilitySchema = z.enum(["public", "masked", "request"]);

export const skillSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.string().optional(),
  visibility: visibilitySchema.optional().default("public"),
});

export const experienceSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().max(5000),
  visibility: visibilitySchema.optional().default("public"),
});

export const educationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().max(5000).optional(),
  visibility: visibilitySchema.optional().default("public"),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().optional().or(z.literal("")),
  description: z.string().max(5000),
  visibility: visibilitySchema.optional().default("public"),
});

export const contactInfoSchema = z.object({
  email: z.object({
    value: z.string().email().optional().or(z.literal("")),
    visibility: visibilitySchema,
  }),
  phone: z.object({
    value: z.string().optional(),
    visibility: visibilitySchema,
  }),
});

export const personalInfoSchema = z.object({
  name: z.string().max(100).optional(),
  title: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  linkedin: z.string().url().optional().or(z.literal("")),
  github: z.string().url().optional().or(z.literal("")),
});

export const createResumeSchema = z.object({
  title: z.string().min(1).max(200).optional().default("Untitled Resume"),
  summary: z.string().max(5000).optional(),
  skills: z.array(skillSchema).optional(),
  experience: z.array(experienceSchema).optional(),
  education: z.array(educationSchema).optional(),
  contact: contactInfoSchema.optional(),
  personalInfo: personalInfoSchema.optional(),
  projects: z.array(projectSchema).optional(),
  templateId: z.string().optional(),
});

export type CreateResumeInput = z.infer<typeof createResumeSchema>;

export const comparisonResumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      duration: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      description: z.string(),
      achievements: z.array(z.string()).optional(),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string(),
      year: z.number(),
      gpa: z.number().optional(),
    })
  ),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  contact: z.object({
    email: z.object({ value: z.string() }),
    phone: z.object({ value: z.string() }).optional(),
  }),
});

export const enhanceResumeRequestSchema = z.object({
  resume: comparisonResumeSchema,
  jobDescription: z.string().optional(),
});
