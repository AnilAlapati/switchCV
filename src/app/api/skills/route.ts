/**
 * Skill Matrix API Routes
 * POST /api/skills/inventory - Create/update skill inventory
 * POST /api/skills/analyze - Analyze job gap
 * POST /api/skills/compare - Compare multiple jobs
 * GET /api/skills/inventory/:userId - Get user inventory
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  SkillInventory,
  JobPosting,
  ProficiencyLevel,
  SkillCategory,
} from "@/lib/skillMatrix.types";
import {
  createSkill,
  initializeSkillInventory,
  addSkillToInventory,
} from "@/lib/skillInventory";
import { performGapAnalysis, compareJobFit } from "@/lib/gapAnalysis";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

const CreateInventoryActionSchema = z
  .object({
    action: z.literal("create-inventory"),
    userId: z.string().optional(),
  })
  .strict();

const AddSkillActionSchema = z
  .object({
    action: z.literal("add-skill"),
    inventory: z.unknown(),
    name: z.string().min(1),
    category: z.string().min(1),
    proficiencyLevel: z.string().min(1),
    yearsOfExperience: z.number().optional(),
    description: z.string().optional(),
  })
  .strict();

const AnalyzeGapActionSchema = z
  .object({
    action: z.literal("analyze-gap"),
    inventory: z.unknown().refine((value) => value !== undefined),
    jobPosting: z.unknown().refine((value) => value !== undefined),
  })
  .strict();

const CompareJobsActionSchema = z
  .object({
    action: z.literal("compare-jobs"),
    inventory: z.unknown(),
    jobs: z.array(z.unknown()),
  })
  .strict();

const SkillsActionSchema = z.discriminatedUnion("action", [
  CreateInventoryActionSchema,
  AddSkillActionSchema,
  AnalyzeGapActionSchema,
  CompareJobsActionSchema,
]);

export async function POST(request: NextRequest) {
  try {
    const { userId: authenticatedUserId, error } =
      await getAuthenticatedUserId(request);
    if (error) return error;

    const payload = await request.json();
    const parseResult = SkillsActionSchema.safeParse(payload);
    if (!parseResult.success) {
      const action =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).action
          : undefined;
      if (action === "add-skill") {
        return handleApiError(
          parseResult.error,
          "inventory, name, category, and proficiencyLevel are required",
          400,
        );
      }
      if (action === "analyze-gap") {
        return handleApiError(
          parseResult.error,
          "inventory and jobPosting are required",
          400,
        );
      }
      if (action === "compare-jobs") {
        return handleApiError(
          parseResult.error,
          "inventory and jobs array are required",
          400,
        );
      }
      return handleApiError(parseResult.error, "Unknown action", 400);
    }

    if (parseResult.data.action === "create-inventory") {
      const inventoryUserId = parseResult.data.userId || authenticatedUserId;
      if (!inventoryUserId) {
        return handleApiError(null, "userId is required", 400);
      }

      const inventory = initializeSkillInventory(inventoryUserId);
      return NextResponse.json(inventory, { status: 201 });
    }

    if (parseResult.data.action === "add-skill") {
      const {
        inventory,
        name,
        category,
        proficiencyLevel,
        yearsOfExperience,
        description,
      } = parseResult.data;

      try {
        const skill = createSkill(
          name,
          category as SkillCategory,
          proficiencyLevel as ProficiencyLevel,
          yearsOfExperience,
          description,
        );

        const updated = addSkillToInventory(inventory as SkillInventory, skill);
        return NextResponse.json(updated, { status: 200 });
      } catch (error) {
        return handleApiError(error, "Failed to add skill", 400);
      }
    }

    if (parseResult.data.action === "analyze-gap") {
      const { inventory, jobPosting } = parseResult.data;

      try {
        const report = performGapAnalysis(
          inventory as SkillInventory,
          jobPosting as JobPosting,
        );
        return NextResponse.json(report, { status: 200 });
      } catch (error) {
        return handleApiError(error, "Gap analysis failed", 500);
      }
    }

    if (parseResult.data.action === "compare-jobs") {
      const { inventory, jobs } = parseResult.data;

      try {
        const comparisons = compareJobFit(
          inventory as SkillInventory,
          jobs as JobPosting[],
        );
        return NextResponse.json(comparisons, { status: 200 });
      } catch (error) {
        return handleApiError(error, "Job comparison failed", 500);
      }
    }

    return handleApiError(null, "Unknown action", 400);
  } catch (error) {
    return handleApiError(error, "Internal server error");
  }
}
