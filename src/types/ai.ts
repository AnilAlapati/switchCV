export type UserTier = "basic" | "premium" | "enterprise";

export type AIProvider = "google" | "openai" | "groq" | "anthropic" | "xai";

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

/** Gemini function declaration parameter schema (JSON Schema subset) */
export interface GeminiFunctionParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: GeminiFunctionParameter;
  properties?: Record<string, GeminiFunctionParameter>;
  required?: string[];
}

/** Single Gemini function declaration (tool) */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters?: {
    type: "object";
    properties: Record<string, GeminiFunctionParameter>;
    required?: string[];
  };
}

/** A single function call returned by the model */
export interface AIToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GenerateOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  userTier: UserTier;
  /** Optional explicit model selection (id from AI_MODELS) */
  modelId?: string;
  /** When true, request JSON mode from the provider (OpenAI/Groq response_format) */
  jsonMode?: boolean;
  /** Optional Gemini-specific structured output schema */
  responseSchema?: Record<string, unknown>;
  /** Optional Gemini function declarations for function calling (Gemini only) */
  tools?: GeminiFunctionDeclaration[];
  /** Optional Gemini system instruction (passed separately from user content) */
  systemInstruction?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  provider: string;
  tier: string;
  estimatedCost: number;
  /** Function calls returned by the model (only present when tools were provided) */
  toolCalls?: AIToolCall[];
}

export interface SelectableModel {
  id: string;
  name: string;
  provider: AIProvider;
  tier: AIModelConfig["tier"];
  quality: number;
  costPer1MTokens: number;
}
