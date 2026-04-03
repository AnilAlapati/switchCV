import { z } from "zod";

const SkillCategorySchema = z.enum([
  "technical",
  "soft-skills",
  "domain",
  "tool-technology",
  "language",
  "certification",
  "other",
]);

const ProficiencyLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert",
]);

/** Validates create-inventory action for POST /api/skills. */
export const CreateSkillInventoryActionSchema = z
  .object({
    action: z.literal("create-inventory"),
  })
  .strict();

/** Validates add-skill action for POST /api/skills. */
export const AddSkillActionSchema = z
  .object({
    action: z.literal("add-skill"),
    inventory: z.record(z.string(), z.unknown()),
    name: z.string().min(1).max(100),
    category: SkillCategorySchema,
    proficiencyLevel: ProficiencyLevelSchema,
    yearsOfExperience: z.number().min(0).max(80).optional(),
    description: z.string().max(2000).optional(),
  })
  .strict();

/** Validates analyze-gap action for POST /api/skills. */
export const AnalyzeSkillGapActionSchema = z
  .object({
    action: z.literal("analyze-gap"),
    inventory: z.record(z.string(), z.unknown()),
    jobPosting: z.record(z.string(), z.unknown()),
  })
  .strict();

/** Validates compare-jobs action for POST /api/skills. */
export const CompareSkillJobsActionSchema = z
  .object({
    action: z.literal("compare-jobs"),
    inventory: z.record(z.string(), z.unknown()),
    jobs: z.array(z.record(z.string(), z.unknown())).min(1).max(20),
  })
  .strict();

/** Validates input for POST /api/skills. */
export const SkillsActionSchema = z.discriminatedUnion("action", [
  CreateSkillInventoryActionSchema,
  AddSkillActionSchema,
  AnalyzeSkillGapActionSchema,
  CompareSkillJobsActionSchema,
]);

export type SkillsActionInput = z.infer<typeof SkillsActionSchema>;
