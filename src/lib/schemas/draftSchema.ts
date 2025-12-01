/**
 * Draft Update Validation Schema
 *
 * Provides Zod schema for validating draft update requests.
 * Ensures all updates conform to expected structure and limits.
 *
 * @module lib/schemas/draftSchema
 */

import { z } from "zod";
import { getConstants } from "@/lib/getSystemConfig";

/**
 * Get the draft profile update schema with dynamic validation limits
 */
export const getDraftProfileUpdateSchema = async () => {
  const constants = await getConstants();

  /**
   * Visibility enum for resume fields
   */
  const VisibilitySchema = z.enum(["public", "masked", "request"]);

  /**
   * Schema for personal info updates
   */
  const PersonalInfoUpdateSchema = z
    .object({
      name: z.string().max(constants.VALIDATION.MAX_TITLE_LENGTH).optional(),
      title: z.string().max(constants.VALIDATION.MAX_TITLE_LENGTH).optional(),
      email: z.string().email().max(254).optional(),
      phone: z.string().max(30).optional(),
      location: z
        .string()
        .max(constants.VALIDATION.MAX_TITLE_LENGTH)
        .optional(),
      linkedin: z.string().url().max(500).optional().or(z.literal("")),
      github: z.string().url().max(500).optional().or(z.literal("")),
    })
    .strict();

  /**
   * Schema for skill updates
   */
  const SkillUpdateSchema = z.object({
    name: z.string().min(1).max(100),
    level: z.string().max(50),
    visibility: VisibilitySchema.optional(),
  });

  /**
   * Schema for experience updates
   */
  const ExperienceUpdateSchema = z.object({
    company: z.string().min(1).max(constants.VALIDATION.MAX_TITLE_LENGTH),
    role: z.string().min(1).max(constants.VALIDATION.MAX_TITLE_LENGTH),
    startDate: z.string().max(50),
    endDate: z.string().max(50).optional(),
    description: z.string().max(5000),
    visibility: VisibilitySchema.optional(),
  });

  /**
   * Schema for education updates
   */
  const EducationUpdateSchema = z.object({
    institution: z.string().min(1).max(constants.VALIDATION.MAX_TITLE_LENGTH),
    degree: z.string().min(1).max(constants.VALIDATION.MAX_TITLE_LENGTH),
    startDate: z.string().max(50),
    endDate: z.string().max(50).optional(),
    description: z.string().max(1000).optional(),
    visibility: VisibilitySchema.optional(),
  });

  /**
   * Schema for project updates
   */
  const ProjectUpdateSchema = z.object({
    name: z.string().min(1).max(constants.VALIDATION.MAX_TITLE_LENGTH),
    description: z.string().max(constants.VALIDATION.MAX_SUMMARY_LENGTH),
    url: z.string().url().max(500).optional().or(z.literal("")),
    visibility: VisibilitySchema.optional(),
  });

  /**
   * Schema for contact updates
   */
  const ContactUpdateSchema = z.object({
    email: z
      .object({
        value: z.string().email().max(254),
        visibility: VisibilitySchema,
      })
      .optional(),
    phone: z
      .object({
        value: z.string().max(30),
        visibility: VisibilitySchema,
      })
      .optional(),
  });

  /**
   * Schema for generated text updates
   */
  const GeneratedTextUpdateSchema = z.object({
    draft: z.string().max(50000).optional(),
    polished: z.string().max(50000).optional(),
    lastGeneratedAt: z.string().datetime().optional(),
  });

  /**
   * Complete schema for draft profile updates.
   * All fields are optional to support partial updates (PATCH semantics).
   *
   * Validation includes:
   * - Length limits on all string fields
   * - Array bounds matching VALIDATION constants
   * - URL format validation for links
   * - Email format validation
   * - Strict mode to reject unknown fields
   */
  const DraftProfileUpdateSchema = z
    .object({
      title: z.string().max(constants.VALIDATION.MAX_TITLE_LENGTH).optional(),
      templateId: z.string().max(50).optional(),
      summary: z
        .string()
        .max(constants.VALIDATION.MAX_SUMMARY_LENGTH)
        .optional(),
      personalInfo: PersonalInfoUpdateSchema.optional(),
      skills: z
        .array(SkillUpdateSchema)
        .max(constants.VALIDATION.MAX_SKILLS)
        .optional(),
      experience: z
        .array(ExperienceUpdateSchema)
        .max(constants.VALIDATION.MAX_EXPERIENCE_ENTRIES)
        .optional(),
      education: z
        .array(EducationUpdateSchema)
        .max(constants.VALIDATION.MAX_EDUCATION_ENTRIES)
        .optional(),
      projects: z.array(ProjectUpdateSchema).max(20).optional(),
      contact: ContactUpdateSchema.optional(),
      generatedText: GeneratedTextUpdateSchema.optional(),
      slug: z
        .string()
        .regex(
          /^[a-z0-9-]+$/,
          "Slug must be lowercase alphanumeric with hyphens"
        )
        .min(3)
        .max(100)
        .optional(),
    })
    .strict();

  /**
   * Schema for the complete draft PATCH request body
   */
  const DraftPatchRequestSchema = z.object({
    profile: DraftProfileUpdateSchema.optional(),
  });

  return {
    DraftProfileUpdateSchema,
    DraftPatchRequestSchema,
  };
};

/**
 * Get the draft profile update schema (for backward compatibility)
 * @deprecated Use getDraftProfileUpdateSchema() instead
 */
export const DraftProfileUpdateSchema = z.object({}); // Placeholder

/**
 * Get the draft patch request schema (for backward compatibility)
 * @deprecated Use getDraftProfileUpdateSchema() instead
 */
export const DraftPatchRequestSchema = z.object({}); // Placeholder
