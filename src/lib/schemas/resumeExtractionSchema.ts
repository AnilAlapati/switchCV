/**
 * Resume Extraction Schema
 *
 * Zod schema for AI-powered structured extraction from resume text.
 * Used with Gemini/OpenAI structured output to replace regex-based extractors.
 *
 * Mirrors the ResumeDataRequirements interface but is designed
 * for extraction (all fields optional since any input may lack certain data).
 *
 * @module schemas/resumeExtractionSchema
 */

import { z } from "zod";

export const ExtractionExperienceEntrySchema = z.object({
  title: z.string().optional().describe("Job title or position held"),
  company: z.string().optional().describe("Company or organization name"),
  duration: z
    .string()
    .optional()
    .describe(
      "Employment duration, e.g. 'Jan 2020 - Present' or '2018 - 2021'",
    ),
  description: z
    .string()
    .optional()
    .describe("Job description, key responsibilities, or summary of work"),
  achievements: z
    .array(z.string())
    .optional()
    .describe("Key accomplishments or notable achievements in this role"),
});

export const ExtractionProjectEntrySchema = z.object({
  name: z.string().optional().describe("Project name or title"),
  description: z
    .string()
    .optional()
    .describe(
      "Brief description of the project, its purpose, or what was built",
    ),
  technologies: z
    .array(z.string())
    .optional()
    .describe("Technologies, frameworks, or tools used in this project"),
  url: z
    .string()
    .optional()
    .describe("Project URL, demo link, or repository link"),
  role: z
    .string()
    .optional()
    .describe("The user's role or contribution to the project"),
});

export const ExtractionEducationEntrySchema = z.object({
  degree: z
    .string()
    .optional()
    .describe(
      "Degree type, e.g. 'Bachelor of Science', 'MBA', 'High School Diploma'",
    ),
  institution: z
    .string()
    .optional()
    .describe("School, university, or institution name"),
  year: z
    .string()
    .optional()
    .describe("Graduation year or date range, e.g. '2020' or '2016 - 2020'"),
  major: z.string().optional().describe("Field of study or major"),
  gpa: z
    .string()
    .optional()
    .describe(
      "Academic grade/score EXACTLY as stated by user. Supports all international formats: " +
        "USA: GPA (3.8/4.0) | India: CGPA (8.5/10), percentage (85%), marks (85-89.9%) | " +
        "UK: degree classification (First Class Honours, 2:1, 2:2, Third) | " +
        "Germany: grade (1.3) | Other: any numeric or text grade",
    ),
});

/**
 * Schema for AI-powered resume extraction.
 * All top-level fields are optional — the AI extracts only what's present in the text.
 */
export const ResumeExtractionSchema = z.object({
  name: z.string().optional().describe("Full name of the person"),
  email: z.string().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number in any format"),
  location: z
    .string()
    .optional()
    .describe("City, state, country, or full address"),
  github: z.string().optional().describe("GitHub profile URL"),
  linkedin: z.string().optional().describe("LinkedIn profile URL"),
  twitter: z.string().optional().describe("X/Twitter profile URL or handle"),
  summary: z
    .string()
    .optional()
    .describe("Professional summary, objective, or about section"),
  experience: z
    .array(ExtractionExperienceEntrySchema)
    .optional()
    .describe("Work experience entries"),
  education: z
    .array(ExtractionEducationEntrySchema)
    .optional()
    .describe("Educational background entries"),
  skills: z
    .array(z.string())
    .optional()
    .describe("Professional skills, technologies, and competencies"),
  projects: z
    .array(ExtractionProjectEntrySchema)
    .optional()
    .describe(
      "Personal projects, side projects, freelance work, or open-source contributions",
    ),
});

export type ResumeExtractionResult = z.infer<typeof ResumeExtractionSchema>;
