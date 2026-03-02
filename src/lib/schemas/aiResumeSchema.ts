/**
 * AI Resume Response Validation Schemas
 *
 * This module provides Zod schemas for validating AI-generated resume data.
 * These schemas ensure that AI responses conform to the expected structure
 * before being processed by the application.
 *
 * @module aiResumeSchema
 */

import { z } from "zod";

// ============================================================================
// SHARED SCHEMAS
// ============================================================================

/**
 * Visibility enum for resume fields - must match the main app types
 */
export const VisibilitySchema = z.enum(["public", "masked", "request"]);

// ============================================================================
// COMPONENT SCHEMAS
// ============================================================================

/**
 * Schema for validating AI-generated skill entries
 */
export const AISkillSchema = z.object({
  name: z.string().min(1).max(100),
  level: z.string().min(1).max(50),
  visibility: VisibilitySchema,
});

/**
 * Schema for validating AI-generated experience entries
 */
export const AIExperienceSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  startDate: z.string().min(1).max(20),
  endDate: z.string().min(1).max(20).optional(),
  description: z.string().min(1).max(2000),
  visibility: VisibilitySchema,
});

/**
 * Schema for validating AI-generated education entries
 */
export const AIEducationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(200),
  startDate: z.string().min(1).max(20),
  endDate: z.string().min(1).max(20).optional(),
  grade: z
    .string()
    .max(50)
    .optional()
    .describe(
      "Academic grade/score exactly as stated: GPA (3.8/4.0), CGPA (8.5/10), percentage (85%), degree classification (First Class, 2:1, 2:2), or other format",
    ),
  description: z.string().max(1000).optional(),
  visibility: VisibilitySchema,
});

/**
 * Schema for validating AI-generated project entries
 */
export const AIProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  visibility: VisibilitySchema,
});

/**
 * Schema for validating AI-generated contact info
 */
export const AIContactSchema = z.object({
  email: z.object({
    value: z.string().email().max(254),
    visibility: VisibilitySchema,
  }),
  phone: z.object({
    value: z.string().min(1).max(30),
    visibility: VisibilitySchema,
  }),
});

// ============================================================================
// COMPLETE RESUME SCHEMA
// ============================================================================

/**
 * Complete schema for validating AI-generated resume structure.
 * This ensures the AI response matches our expected data model before
 * it's processed further.
 *
 * Validation includes:
 * - Required fields: title, templateId, summary, skills, experience, contact
 * - Optional fields: education, projects
 * - Length limits on all string fields
 * - Array bounds (min/max items)
 * - Email format validation
 *
 * @see SeedResume type in resumeSeedGenerator.ts
 *
 * @example
 * ```typescript
 * const result = AIResumeResponseSchema.safeParse(aiResponse);
 * if (result.success) {
 *   const validResume: AIResumeResponse = result.data;
 * } else {
 *   logger.error(result.error.issues);
 * }
 * ```
 */
export const AIResumeResponseSchema = z.object({
  title: z.string().min(1).max(200),
  templateId: z.string().min(1).max(50),
  summary: z.string().min(1).max(2000),
  skills: z.array(AISkillSchema).min(1).max(20),
  experience: z.array(AIExperienceSchema).min(1).max(10),
  education: z.array(AIEducationSchema).min(0).max(10),
  contact: AIContactSchema,
  projects: z.array(AIProjectSchema).min(0).max(10),
});

/**
 * TypeScript type inferred from the AIResumeResponseSchema.
 * Use this type when working with validated AI resume responses.
 */
export type AIResumeResponse = z.infer<typeof AIResumeResponseSchema>;
