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

export async function POST(request: NextRequest) {
  try {
    const { action, ...body } = await request.json();

    if (action === "create-inventory") {
      const { userId } = body;

      if (!userId) {
        return NextResponse.json(
          { error: "userId is required" },
          { status: 400 }
        );
      }

      const inventory = initializeSkillInventory(userId);
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
        return NextResponse.json(
          {
            error:
              "inventory, name, category, and proficiencyLevel are required",
          },
          { status: 400 }
        );
      }

      try {
        const skill = createSkill(
          name,
          category as SkillCategory,
          proficiencyLevel as ProficiencyLevel,
          yearsOfExperience,
          description
        );

        const updated = addSkillToInventory(inventory as SkillInventory, skill);
        return NextResponse.json(updated, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Failed to add skill",
          },
          { status: 400 }
        );
      }
    }

    if (action === "analyze-gap") {
      const { inventory, jobPosting } = body;

      if (!inventory || !jobPosting) {
        return NextResponse.json(
          { error: "inventory and jobPosting are required" },
          { status: 400 }
        );
      }

      try {
        const report = performGapAnalysis(
          inventory as SkillInventory,
          jobPosting as JobPosting
        );
        return NextResponse.json(report, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Gap analysis failed",
          },
          { status: 500 }
        );
      }
    }

    if (action === "compare-jobs") {
      const { inventory, jobs } = body;

      if (!inventory || !jobs || !Array.isArray(jobs)) {
        return NextResponse.json(
          { error: "inventory and jobs array are required" },
          { status: 400 }
        );
      }

      try {
        const comparisons = compareJobFit(
          inventory as SkillInventory,
          jobs as JobPosting[]
        );
        return NextResponse.json(comparisons, { status: 200 });
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Job comparison failed",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
