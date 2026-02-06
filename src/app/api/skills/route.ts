/**
 * Skill Matrix API Routes
 * POST /api/skills/inventory - Create/update skill inventory
 * POST /api/skills/analyze - Analyze job gap
 * POST /api/skills/compare - Compare multiple jobs
 * GET /api/skills/inventory/:userId - Get user inventory
 */

import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  // SECURITY: Authenticate user first
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const { action, ...body } = await request.json();

    if (action === "create-inventory") {
      const inventory = initializeSkillInventory(userId!);
      return NextResponse.json(inventory, { status: 201 });
    }

    if (action === "add-skill") {
      const {
        inventory,
        name,
        category,
        proficiencyLevel,
        yearsOfExperience,
        description,
      } = body;

      if (!inventory || !name || !category || !proficiencyLevel) {
        return handleApiError(
          new Error(
            "inventory, name, category, and proficiencyLevel are required",
          ),
          "inventory, name, category, and proficiencyLevel are required",
          400,
        );
      }

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

    if (action === "analyze-gap") {
      const { inventory, jobPosting } = body;

      if (!inventory || !jobPosting) {
        return handleApiError(
          new Error("inventory and jobPosting are required"),
          "inventory and jobPosting are required",
          400,
        );
      }

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

    if (action === "compare-jobs") {
      const { inventory, jobs } = body;

      if (!inventory || !jobs || !Array.isArray(jobs)) {
        return handleApiError(
          new Error("inventory and jobs array are required"),
          "inventory and jobs array are required",
          400,
        );
      }

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

    return handleApiError(new Error("Unknown action"), "Unknown action", 400);
  } catch (error) {
    return handleApiError(error, "Internal server error");
  }
}
