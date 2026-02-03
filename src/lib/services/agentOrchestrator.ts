import { getSystemConfig } from "@/lib/getSystemConfig";
import { checkBudget, trackCost } from "./costControlService";
import { logger } from "@/lib/logger";
import {
  ResearchAgent,
  PlanningAgent,
  WritingAgent,
  AuditorAgent,
  type AgentContext,
} from "./agents";

interface AgenticWorkflowData {
  jobDescription?: string;
  userResume?: string;
  instructions?: string;
  outputFormatInstruction?: string;
  mode?: "standard" | "autonomous";
}

// Mode-aware cost estimation
const COST_PER_RUN = {
  standard: 0.003,
  autonomous: 0.008,
};

/**
 * Get tier-based model configuration
 */
function getTierModels(role: string): { planning: string; execution: string } {
  if (["basic", "jobseeker", "free"].includes(role)) {
    return { planning: "gemini-2.5-flash-lite", execution: "gemini-2.5-flash-lite" };
  } else if (role === "enterprise") {
    return { planning: "gemini-2.5-pro", execution: "gemini-2.5-pro" };
  } else {
    return { planning: "gemini-2.5-flash", execution: "gemini-2.5-flash" };
  }
}

/**
 * Run the autonomous 4-agent workflow
 */
async function runAutonomousWorkflow(
  context: AgentContext,
  planningModel: string,
  executionModel: string
): Promise<{ resumeMarkdown: string; templateId?: string; reasoning?: string }> {
  // Step 1: Scout Agent (Research)
  const scoutAgent = new ResearchAgent(planningModel);
  const researchResult = await scoutAgent.run(undefined, context);
  if (!researchResult.success || !researchResult.data) {
    throw new Error(`ScoutAgent failed: ${researchResult.error}`);
  }

  // Step 2: Architect Agent (Planning)
  const architectAgent = new PlanningAgent(planningModel);
  const planResult = await architectAgent.run(
    { researchOutput: researchResult.data },
    context
  );
  if (!planResult.success || !planResult.data) {
    throw new Error(`ArchitectAgent failed: ${planResult.error}`);
  }

  // Step 3: Writer Agent (Writing + Polished)
  const writerAgent = new WritingAgent(executionModel);
  const writingResult = await writerAgent.run(
    { planOutput: planResult.data },
    context
  );
  if (!writingResult.success || !writingResult.data) {
    throw new Error(`WriterAgent failed: ${writingResult.error}`);
  }

  // Step 4: Auditor Agent (Validation + Design)
  const auditorAgent = new AuditorAgent(planningModel);
  const auditorResult = await auditorAgent.run(
    { executionOutput: writingResult.data },
    context
  );

  // Even if Auditor fails its validation check (NEEDS_WORK), 
  // we return the resume but could log the critique.
  // Template selection is the key "final" value here.

  return {
    resumeMarkdown: writingResult.data.resumeMarkdown,
    templateId: auditorResult.data?.suggestedTemplateId,
    reasoning: auditorResult.data?.designReasoning,
  };
}

/**
 * Run the standard 2-agent workflow (Planning -> Writing)
 */
async function runStandardWorkflow(
  context: AgentContext,
  planningModel: string,
  executionModel: string
): Promise<string> {
  // Step 1: Architect Agent (Planning)
  const architectAgent = new PlanningAgent(planningModel);
  const planResult = await architectAgent.run({}, context);
  if (!planResult.success || !planResult.data) {
    throw new Error(`ArchitectAgent failed: ${planResult.error}`);
  }

  // Step 2: Writer Agent (Writing)
  const writerAgent = new WritingAgent(executionModel);
  const writingResult = await writerAgent.run(
    { planOutput: planResult.data },
    context
  );
  if (!writingResult.success || !writingResult.data) {
    throw new Error(`WriterAgent failed: ${writingResult.error}`);
  }

  return writingResult.data.resumeMarkdown;
}

/**
 * Main entry point: Runs the agentic workflow if enabled/safe
 */
export async function runAgenticWorkflow(
  userId: string,
  userRole: string,
  data: AgenticWorkflowData
): Promise<{ resumeMarkdown: string; templateId?: string; reasoning?: string } | null> {
  const config = await getSystemConfig();

  // 1. GLOBAL KILL SWITCH
  if (!config.agentic?.enabled) {
    logger.info("Agentic workflow disabled via config.");
    return null;
  }

  // 2. BUDGET CHECK (Only for Free/Promotional models)
  const isFreeTier = ["basic", "jobseeker", "free"].includes(userRole);

  if (isFreeTier) {
    const isBudgetSafe = await checkBudget(config.agentic.budgetCap);
    if (!isBudgetSafe) {
      logger.warn("Global budget cap exceeded.");
      return null;
    }
  }

  // 3. USER USAGE LIMIT CHECK
  if (isFreeTier) {
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      const userDoc = await adminDb.collection("users").doc(userId).get();
      const usageCount = userDoc.data()?.agentic?.usageCount || 0;
      const { FREE_TIER_AGENT_LIMIT } = await import("@/lib/config.client");

      if (usageCount >= FREE_TIER_AGENT_LIMIT) {
        logger.info(
          `User ${userId} exceeded free agentic limit (${usageCount}/${FREE_TIER_AGENT_LIMIT}).`
        );
        return null;
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to check user usage limit");
      return null;
    }
  }

  // 4. MODEL SELECTION
  const { planning: planningModel, execution: executionModel } =
    getTierModels(userRole);

  // 5. BUILD AGENT CONTEXT
  const context: AgentContext = {
    userId,
    jobDescription: data.jobDescription,
    userResume: data.userResume,
    model: planningModel,
    outputFormatInstruction: data.outputFormatInstruction,
  };

  const mode = data.mode || "standard";

  try {
    logger.info({ userId, role: userRole, mode }, "Starting Agentic Workflow");

    let result: { resumeMarkdown: string; templateId?: string; reasoning?: string };

    if (mode === "autonomous") {
      result = await runAutonomousWorkflow(
        context,
        planningModel,
        executionModel
      );
    } else {
      const resumeMarkdown = await runStandardWorkflow(
        context,
        planningModel,
        executionModel
      );
      result = { resumeMarkdown };
    }

    // TRACK COST (Mode-aware)
    if (isFreeTier) {
      const cost = COST_PER_RUN[mode];
      trackCost(userId, cost, "agentic_workflow").catch((err) =>
        logger.error({ err }, "Failed to track cost")
      );
    }

    // TRACK USAGE
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      const { FieldValue } = await import("firebase-admin/firestore");

      await adminDb
        .collection("users")
        .doc(userId)
        .set(
          {
            agentic: {
              usageCount: FieldValue.increment(1),
              lastRunAt: new Date().toISOString(),
              lastMode: mode,
              lastTemplateRecommendation: result.templateId || null,
            },
          },
          { merge: true }
        );
    } catch (error) {
      logger.error({ err: error }, "Failed to track user usage");
    }

    return result;
  } catch (error) {
    logger.error({ error }, "Agentic workflow failed, falling back to standard.");
    return null;
  }
}
