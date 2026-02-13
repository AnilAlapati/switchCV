import { getSystemConfig } from "@/lib/getSystemConfig";
import { BillingService } from "./billingService";
import { logger } from "@/lib/logger";
import { getTierModels } from "@/lib/config/aiModels";
import { withRetry } from "@/lib/utils/retry";
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
 * Run the autonomous 4-agent workflow
 */
async function runAutonomousWorkflow(
  context: AgentContext,
  planningModel: string,
  executionModel: string,
): Promise<{
  resumeMarkdown: string;
  templateId?: string;
  reasoning?: string;
}> {
  // Step 1: Scout Agent (Research) — with retry
  const scoutAgent = new ResearchAgent(planningModel);
  const researchResult = await withRetry(
    () => scoutAgent.run(undefined, context),
    1, // 1 retry (2 total attempts)
    1000,
  );
  if (!researchResult.success || !researchResult.data) {
    throw new Error(`ScoutAgent failed: ${researchResult.error}`);
  }

  // Step 2: Architect Agent (Planning) — with retry
  const architectAgent = new PlanningAgent(planningModel);
  const planResult = await withRetry(
    () => architectAgent.run({ researchOutput: researchResult.data }, context),
    1,
    1000,
  );
  if (!planResult.success || !planResult.data) {
    throw new Error(`ArchitectAgent failed: ${planResult.error}`);
  }

  // Step 3: Writer Agent (Writing + Polished) — with retry
  const writerAgent = new WritingAgent(executionModel);
  let writingResult = await withRetry(
    () => writerAgent.run({ planOutput: planResult.data! }, context),
    1,
    1000,
  );
  if (!writingResult.success || !writingResult.data) {
    throw new Error(`WriterAgent failed: ${writingResult.error}`);
  }

  // Step 4: Auditor Agent (Validation + Design) — with retry
  const auditorAgent = new AuditorAgent(planningModel);
  const auditorResult = await withRetry(
    () => auditorAgent.run({ executionOutput: writingResult.data! }, context),
    1,
    1000,
  );

  // Step 4b: If Auditor says NEEDS_WORK, re-run Writer once with critique
  if (
    auditorResult.data?.status === "NEEDS_WORK" &&
    auditorResult.data?.critique
  ) {
    logger.info(
      { critique: auditorResult.data.critique.slice(0, 200) },
      "AuditorAgent returned NEEDS_WORK — re-running WriterAgent with critique",
    );

    const revisedContext: AgentContext = {
      ...context,
      // Append auditor critique as additional instructions for the writer
      instructions: [
        context.instructions || "",
        `\n\nAUDITOR FEEDBACK (please address these issues):\n${auditorResult.data.critique}`,
      ]
        .join("")
        .trim(),
    };

    const revisedWritingResult = await writerAgent.run(
      { planOutput: planResult.data },
      revisedContext,
    );

    if (revisedWritingResult.success && revisedWritingResult.data) {
      writingResult = revisedWritingResult;
      logger.info(
        "WriterAgent revision after NEEDS_WORK completed successfully",
      );
    } else {
      logger.warn("WriterAgent revision failed — using original output");
    }
  }

  return {
    resumeMarkdown: writingResult.data!.resumeMarkdown,
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
  executionModel: string,
): Promise<string> {
  // Step 1: Architect Agent (Planning) — with retry
  const architectAgent = new PlanningAgent(planningModel);
  const planResult = await withRetry(
    () => architectAgent.run({}, context),
    1,
    1000,
  );
  if (!planResult.success || !planResult.data) {
    throw new Error(`ArchitectAgent failed: ${planResult.error}`);
  }

  // Step 2: Writer Agent (Writing) — with retry
  const writerAgent = new WritingAgent(executionModel);
  const writingResult = await withRetry(
    () => writerAgent.run({ planOutput: planResult.data! }, context),
    1,
    1000,
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
  data: AgenticWorkflowData,
): Promise<{
  resumeMarkdown: string;
  templateId?: string;
  reasoning?: string;
} | null> {
  const config = await getSystemConfig();

  // 1. GLOBAL KILL SWITCH
  if (!config.agentic?.enabled) {
    logger.info("Agentic workflow disabled via config.");
    return null;
  }

  // 2. BUDGET CHECK (Only for Free/Promotional models)
  const isFreeTier = ["basic", "jobseeker", "free"].includes(userRole);

  if (isFreeTier) {
    const isBudgetSafe = await BillingService.checkSystemBudget(
      config.agentic.budgetCap,
    );
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
          `User ${userId} exceeded free agentic limit (${usageCount}/${FREE_TIER_AGENT_LIMIT}).`,
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
    instructions: data.instructions,
  };

  const mode = data.mode || "standard";

  try {
    logger.info({ userId, role: userRole, mode }, "Starting Agentic Workflow");

    let result: {
      resumeMarkdown: string;
      templateId?: string;
      reasoning?: string;
    };

    if (mode === "autonomous") {
      result = await runAutonomousWorkflow(
        context,
        planningModel,
        executionModel,
      );
    } else {
      const resumeMarkdown = await runStandardWorkflow(
        context,
        planningModel,
        executionModel,
      );
      result = { resumeMarkdown };
    }

    // TRACK COST (Mode-aware)
    if (isFreeTier) {
      const cost = COST_PER_RUN[mode];
      BillingService.trackCost(userId, cost, "agentic_workflow").catch((err) =>
        logger.error({ err }, "Failed to track cost"),
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
          { merge: true },
        );
    } catch (error) {
      logger.error({ err: error }, "Failed to track user usage");
    }

    return result;
  } catch (error) {
    logger.error(
      { error },
      "Agentic workflow failed, falling back to standard.",
    );
    return null;
  }
}
