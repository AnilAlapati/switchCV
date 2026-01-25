export type UserTier = "basic" | "premium" | "enterprise";

export type AIProvider =
  | "google"
  | "openai"
  | "groq"
  | "anthropic"
  | "xai";

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  costPer1MTokens: number;
  quality: number;
  speed: number;
  maxTokens: number;
  tier: "free" | "cheap" | "standard" | "premium";
}

export interface GenerateOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  userTier: UserTier;
  /** Optional explicit model selection (id from AI_MODELS) */
  modelId?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  provider: string;
  tier: string;
  estimatedCost: number;
}

export interface SelectableModel {
  id: string;
  name: string;
  provider: AIProvider;
  tier: AIModelConfig["tier"];
  quality: number;
  costPer1MTokens: number;
}
