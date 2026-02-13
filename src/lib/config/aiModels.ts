/**
 * Centralized AI model configuration for tier-based model selection.
 *
 * Used by the agentic workflow orchestrator and recruiter agent service
 * to select appropriate models based on user subscription tier/role.
 */

export interface TierModels {
  /** Model used for planning/analysis tasks (lighter, cheaper) */
  planning: string;
  /** Model used for execution/generation tasks (more capable) */
  execution: string;
}

/**
 * Get tier-based model configuration.
 *
 * @param role - User role or subscription tier
 * @returns Model identifiers for planning and execution tasks
 */
export function getTierModels(role: string): TierModels {
  if (["basic", "jobseeker", "free"].includes(role)) {
    return {
      planning: "gemini-2.5-flash-lite",
      execution: "gemini-2.5-flash-lite",
    };
  } else if (role === "enterprise") {
    return { planning: "gemini-2.5-pro", execution: "gemini-2.5-pro" };
  } else {
    // premium / recruiter / default
    return { planning: "gemini-2.5-flash", execution: "gemini-2.5-flash" };
  }
}

/** Default model when no user tier context is available */
export const DEFAULT_MODEL = "gemini-2.5-flash";
