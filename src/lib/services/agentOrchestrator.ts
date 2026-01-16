import { getSystemConfig } from "@/lib/getSystemConfig";
import { checkBudget, trackCost } from "./costControlService";
import { generateText } from "./aiGenerationService";
import { logger } from "@/lib/logger";

interface AgenticWorkflowData {
  jobDescription?: string;
  userResume?: string; // Text content
  instructions?: string;
  outputFormatInstruction?: string; // e.g. "Output valid JSON..."
}

const ESTIMATED_COST_PER_RUN = 0.005; // $0.005 per run estimate (blended)

/**
 * Runs the agentic workflow if enabled/safe, otherwise falls back to standard generation.
 */
export async function runAgenticWorkflow(
  userId: string,
  userRole: string,
  data: AgenticWorkflowData
): Promise<string | null> {
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
  const planningModel = isFreeTier ? "gemini-1.5-pro" : "gemini-1.5-pro";
  const executionModel = isFreeTier ? "gemini-1.5-flash" : "gemini-1.5-pro";

  try {
    logger.info({ userId, role: userRole }, "Starting Agentic Workflow");

    // --- STEP 1: PLANNING AGENT ---
    // The "Brain" - Analyzes the job description and user resume to create a strategy.
    const planningPrompt = `
      You are an expert Resume Strategist. 
      Analyze the following Job Description and User Resume. 
      Create a bulleted plan to tailor the resume for this specific job. 
      Focus on keywords, structure, and highlighting relevant experience.

      JOB DESCRIPTION:
      ${data.jobDescription || "No specific job description provided."}

      USER RESUME:
      ${data.userResume || "No specific resume content provided."}
    `;

    const planResult = await generateText(
      planningPrompt,
      1000,
      0.7,
      planningModel
    );
    const plan = planResult.text;
    logger.info({ userId }, "Agentic Planning Complete");

    // --- STEP 2: EXECUTION AGENT ("The Writer") ---
    // The "Muscle" - Writes the actual resume content based on the plan.
    const executionPrompt = `
      You are a professional Resume Writer. 
      Using the following Plan, rewrite the user's resume.
      Adhere strictly to the plan.

      PLAN:
      ${plan}

      USER RESUME:
      ${data.userResume}

      ${data.jobDescription}
      
      ${data.outputFormatInstruction ||
      "Output the full resume content in Markdown format. DO NOT include explanations."
      }
    `;

    const executionResult = await generateText(
      executionPrompt,
      2500,
      0.7,
      executionModel
    );
    const finalResume = executionResult.text;

    // --- TRACK COST (Only against 'Growth Budget' if user is Free) ---
    if (isFreeTier) {
      // Fire and forget cost tracking
      trackCost(userId, ESTIMATED_COST_PER_RUN, "agentic_workflow").catch((err) =>
        logger.error({ err }, "Failed to track cost")
      );
    }

    // --- TRACK USAGE ---
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
            },
          },
          { merge: true }
        );
    } catch (error) {
      logger.error({ err: error }, "Failed to track user usage");
    }

    return finalResume;
  } catch (error) {
    logger.error(
      { error },
      "Agentic workflow failed, falling back to standard."
    );
    return null;
  }
}
