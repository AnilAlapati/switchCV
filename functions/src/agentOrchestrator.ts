import { getSystemConfig } from "./lib/getSystemConfig";
import { checkBudget } from "./lib/costControlService";
import { billingService } from "./services/billingService";
import * as functions from "firebase-functions";

// We need to call resumeService's generation logic or AI logic from here.
// Since we are in the same package (functions/src), we can import from resumeService.
// BUT agentOrchestrator logic wants to REPLACE/WRAP standard logic.
// So agentOrchestrator should probably export a boolean "shouldRunAgentic" and "getAgenticModel" helper?
// Or we implement the full flow here?

// The Agentic Flow does multi-step.
// Standard flow does single-step.

interface AgenticWorkflowData {
    jobDescription?: string;
    userResume?: string;
    instructions?: string;
}

const ESTIMATED_COST_PER_RUN = 0.005;

export async function runAgenticWorkflow(
    userId: string,
    userRole: string,
    data: AgenticWorkflowData,
    executor: (prompt: string, model: string) => Promise<string>
): Promise<string | null> {
    // Returns string if agentic flow ran, null if fallback needed

    const config = await getSystemConfig();

    // 1. GLOBAL KILL SWITCH
    if (!config.agentic?.enabled) {
        functions.logger.info("Agentic workflow disabled via config.");
        return null;
    }

    // 2. BUDGET CHECK
    const isFreeTier = ["basic", "jobseeker", "free"].includes(userRole);

    if (isFreeTier) {
        const isBudgetSafe = await checkBudget(config.agentic.budgetCap);
        if (!isBudgetSafe) {
            functions.logger.warn("Global budget cap exceeded.");
            return null;
        }
    }

    // 3. USER USAGE LIMIT CHECK
    if (isFreeTier) {
        try {
            const { adminDb } = await import("./lib/firebase");
            const userDoc = await adminDb.collection("users").doc(userId).get();
            const usageCount = userDoc.data()?.agentic?.usageCount || 0;

            // Hardcoded limit for Functions to avoid dependency issues, matching config.client.ts
            const FREE_LIMIT = 5;

            if (usageCount >= FREE_LIMIT) {
                functions.logger.info(`User ${userId} exceeded free agentic limit (${usageCount}/${FREE_LIMIT}).`);
                return null;
            }
        } catch (error) {
            functions.logger.error("Failed to check user usage limit:", error);
            // Fail open? or Fail closed?
            // Let's fail open (allow run) to avoid blocking users on db error, 
            // but log it. Or fail safe to protect cost?
            // "Safe" means protect cost. So return null.
            return null;
        }
    }

    // 4. MODEL SELECTION - Use tier-based models
    // Basic/Free: Cheap models (gemini-2.0-flash)
    // Premium: Standard models (gemini-2.5-flash)
    // Enterprise: Best models (gemini-2.5-pro)
    const getTierModels = (role: string): { planning: string; execution: string } => {
        if (["basic", "jobseeker", "free"].includes(role)) {
            // Free tier: Use cheapest models
            return { planning: "gemini-2.5-flash-lite", execution: "gemini-2.5-flash-lite" };
        } else if (role === "enterprise") {
            // Enterprise: Use best models
            return { planning: "gemini-2.5-pro", execution: "gemini-2.5-pro" };
        } else {
            // Premium: Use standard models
            return { planning: "gemini-2.5-flash", execution: "gemini-2.5-flash" };
        }
    };

    const { planning: planningModel, execution: executionModel } = getTierModels(userRole);

    try {
        functions.logger.info(`Starting Agentic Workflow for ${userId} (${userRole})`);

        // --- STEP 1: PLANNING AGENT ---
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

        const plan = await executor(planningPrompt, planningModel);
        functions.logger.info("Agentic Planning Complete");

        // --- STEP 2: EXECUTION AGENT ---
        const executionPrompt = `
      You are a professional Resume Writer. 
      Using the following Plan, rewrite the user's resume.
      Adhere strictly to the plan.

      PLAN:
      ${plan}

      USER RESUME:
      ${data.userResume}

      JOB DESCRIPTION:
      ${data.jobDescription}
      
      Output the full resume content in Markdown format.
      DO NOT include explanations, just the resume.
    `;

        const finalResume = await executor(executionPrompt, executionModel);

        // --- TRACK COST ---
        if (isFreeTier) {
            // trackCost(ESTIMATED_COST_PER_RUN).catch(err => functions.logger.error("Failed to track cost", err));
            billingService.trackUsage(userId, ESTIMATED_COST_PER_RUN, "agentic_workflow")
                .catch(err => functions.logger.error("Failed to track billing usage", err));
        }

        // --- TRACK USAGE ---
        try {
            const { adminDb } = await import("./lib/firebase");
            const { FieldValue } = await import("firebase-admin/firestore");

            await adminDb.collection("users").doc(userId).set({
                agentic: {
                    usageCount: FieldValue.increment(1),
                    lastRunAt: new Date().toISOString()
                }
            }, { merge: true });
        } catch (error) {
            functions.logger.error("Failed to track user usage:", error);
        }

        return finalResume;

    } catch (error) {
        functions.logger.error("Agentic workflow failed:", error);
        return null; // Fallback
    }
}
