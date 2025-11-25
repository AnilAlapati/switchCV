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
 * - Minimal questions (6 max in beta)
 * - Smart context window (20 messages)
 * - Prioritizes essential fields first
 */
export const DEFAULT_CONFIG: ConversationConfig = {
  contextWindowSize: 20,
  maxQuestionsInBetaMode: true,
  maxBetaQuestions: 6,
  enableSmartQuestions: true,
  priorityFields: [
    "name", // 1. Essential - must have
    "email", // 2. Essential - must have
    "summary", // 3. Essential - professional summary
    "experience", // 4. Important - work history
    "education", // 5. Important - background
    "skills", // 6. Nice to have - skills
  ],
  minimumRequiredFields: ["name", "email", "summary"],
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
  completionThreshold: 60, // 60% completion = ready to create resume
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
