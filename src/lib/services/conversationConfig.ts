/**
 * Conversation Configuration
 *
 * Configurable settings for the conversational resume building process.
 * Easily adjustable for different scenarios: beta mode, production, etc.
 *
 * @module services/conversationConfig
 */

export interface ConversationConfig {
  /** Maximum number of messages to keep in context window for AI prompts */
  contextWindowSize: number;
  /** Maximum number of questions to ask in beta mode before offering to create resume */
  maxQuestionsInBetaMode: boolean;
  /** Maximum number of questions allowed in beta mode */
  maxBetaQuestions: number;
  /** Whether to enable smart question selection (asks only critical fields first) */
  enableSmartQuestions: boolean;
  /** Fields to prioritize when asking questions (in order of importance) */
  priorityFields: string[];
  /** Minimum data required to create a resume */
  minimumRequiredFields: string[];
  /** Recommended fields for a complete resume */
  recommendedFields: string[];
  /** Completion threshold percentage (when to offer resume creation) */
  completionThreshold: number;
  /** Mode: 'beta' or 'production' */
  mode: "beta" | "production";
}

/**
 * Default configuration for beta mode
 * - Minimal questions (4 max in beta for faster flow)
 * - Smart context window (20 messages)
 * - Prioritizes essential fields first
 */
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 20,
  maxQuestionsInBetaMode: true,
  maxBetaQuestions: 4, // Reduced from 6 to 4 for faster completion
  enableSmartQuestions: true,
  priorityFields: [
    "name", // 1. Essential - must have
    "email", // 2. Essential - must have
    "targetRole", // 3. NEW - helps tailor resume
    "experience", // 4. Important - work history
    "education", // 5. Important - background
    "skills", // 6. Inferred if not explicit
  ],
  minimumRequiredFields: ["name", "email"],
  recommendedFields: [
    "name",
    "email",
    "phone",
    "location",
    "summary",
    "experience",
    "education",
    "skills",
  ],
  completionThreshold: 50, // Lowered from 60% to 50% - offer creation earlier
  mode: "beta",
};

/**
 * Production configuration
 * - More comprehensive
 * - Larger context window
 * - Gathers all available information
 */
export const PRODUCTION_CONFIG: ConversationConfig = {
  contextWindowSize: 50,
  maxQuestionsInBetaMode: false,
  maxBetaQuestions: Infinity,
  enableSmartQuestions: false,
  priorityFields: DEFAULT_CONFIG.priorityFields,
  minimumRequiredFields: DEFAULT_CONFIG.minimumRequiredFields,
  recommendedFields: DEFAULT_CONFIG.recommendedFields,
  completionThreshold: 80,
  mode: "production",
};

/**
 * Get active configuration
 * Determines configuration based on NODE_ENV or explicit setting
 */
export function getActiveConfig(): ConversationConfig {
  const env = process.env.RESUME_MODE || process.env.NODE_ENV || "development";

  if (env === "production") {
    return PRODUCTION_CONFIG;
  }

  return DEFAULT_CONFIG;
}

/**
 * Create custom configuration by extending defaults
 */
export function createCustomConfig(
  overrides: Partial<ConversationConfig>
): ConversationConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}
