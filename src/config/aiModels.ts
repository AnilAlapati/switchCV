// AI Model Configuration for SwitchCV
export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: "huggingface" | "openai" | "anthropic" | "google";
  modelId: string;
  maxTokens: number;
  costPerToken: number; // in USD
  capabilities: string[];
  recommendedFor: string[];
  isEnabled: boolean;
  tier: "free" | "paid" | "premium";
}

export const AVAILABLE_AI_MODELS: AIModel[] = [
  {
    id: "gpt2-medium",
    name: "GPT-2 Medium",
    description:
      "General-purpose text generation model, good for creative writing and basic enhancements",
    provider: "huggingface",
    modelId: "gpt2-medium",
    maxTokens: 300,
    costPerToken: 0.000001, // Very low cost on Hugging Face
    capabilities: ["text-generation", "creative-writing", "basic-enhancement"],
    recommendedFor: ["resume-summaries", "basic-descriptions"],
    isEnabled: true,
    tier: "free",
  },
  {
    id: "gpt2",
    name: "GPT-2 Base",
    description:
      "Fast and lightweight text generation, perfect for quick enhancements",
    provider: "huggingface",
    modelId: "gpt2",
    maxTokens: 200,
    costPerToken: 0.0000008,
    capabilities: ["text-generation", "fast-processing"],
    recommendedFor: ["quick-edits", "basic-suggestions"],
    isEnabled: true,
    tier: "free",
  },
  {
    id: "flan-t5-base",
    name: "FLAN-T5 Base",
    description:
      "Instruction-tuned model, excellent for structured tasks and following specific instructions",
    provider: "huggingface",
    modelId: "google/flan-t5-base",
    maxTokens: 250,
    costPerToken: 0.000002,
    capabilities: ["instruction-following", "structured-output", "analysis"],
    recommendedFor: [
      "job-matching",
      "skill-analysis",
      "structured-enhancement",
    ],
    isEnabled: true,
    tier: "free",
  },
  {
    id: "microsoft-dialgpt-medium",
    name: "DialoGPT Medium",
    description:
      "Conversational AI model, good for natural language interactions",
    provider: "huggingface",
    modelId: "microsoft/DialoGPT-medium",
    maxTokens: 200,
    costPerToken: 0.0000015,
    capabilities: ["conversational", "natural-language"],
    recommendedFor: ["interactive-features", "chat-based-enhancement"],
    isEnabled: false,
    tier: "free",
  },
  {
    id: "distilgpt2",
    name: "DistilGPT-2",
    description:
      "Lightweight distilled version of GPT-2, fastest processing with good quality",
    provider: "huggingface",
    modelId: "distilgpt2",
    maxTokens: 150,
    costPerToken: 0.0000005,
    capabilities: ["fast-processing", "text-generation"],
    recommendedFor: ["quick-responses", "cost-sensitive-applications"],
    isEnabled: true,
    tier: "free",
  },
  {
    id: "mistral-7b-instruct-v0.3",
    name: "Mistral-7B-Instruct-v0.3",
    description:
      "Advanced instruction-tuned model with excellent reasoning and instruction-following capabilities",
    provider: "huggingface",
    modelId: "mistralai/Mistral-7B-Instruct-v0.3",
    maxTokens: 4096,
    costPerToken: 0.000002, // Estimated cost for local inference
    capabilities: [
      "text-generation",
      "instruction-following",
      "reasoning",
      "function-calling",
    ],
    recommendedFor: [
      "resume-enhancement",
      "job-matching",
      "skill-analysis",
      "complex-tasks",
    ],
    isEnabled: true,
    tier: "premium",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description:
      "Latest fast and efficient multimodal model from Google, excellent for content generation and analysis with improved performance",
    provider: "google",
    modelId: "gemini-2.5-flash",
    maxTokens: 8192,
    costPerToken: 0.000001,
    capabilities: [
      "text-generation",
      "instruction-following",
      "reasoning",
      "analysis",
      "multimodal",
    ],
    recommendedFor: [
      "resume-enhancement",
      "job-matching",
      "skill-analysis",
      "quick-edits",
    ],
    isEnabled: true,
    tier: "free",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description:
      "Most advanced multimodal model from Google with superior reasoning, long context, and enhanced capabilities",
    provider: "google",
    modelId: "gemini-2.5-pro",
    maxTokens: 32768,
    costPerToken: 0.000005,
    capabilities: [
      "text-generation",
      "instruction-following",
      "reasoning",
      "analysis",
      "complex-tasks",
      "multimodal",
    ],
    recommendedFor: [
      "resume-enhancement",
      "job-matching",
      "skill-analysis",
      "complex-tasks",
    ],
    isEnabled: true,
    tier: "premium",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description:
      "Lightweight and cost-effective multimodal model from Google, ideal for high-volume tasks",
    provider: "google",
    modelId: "gemini-2.5-flash-lite",
    maxTokens: 8192,
    costPerToken: 0.0000005,
    capabilities: [
      "text-generation",
      "instruction-following",
      "reasoning",
      "analysis",
      "multimodal",
    ],
    recommendedFor: [
      "quick-edits",
      "basic-suggestions",
      "high-volume-tasks",
    ],
    isEnabled: true,
    tier: "free",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description:
      "Fast and efficient Gemini 2.0 model, balanced speed and quality for production use",
    provider: "google",
    modelId: "gemini-2.0-flash",
    maxTokens: 8192,
    costPerToken: 0.000001,
    capabilities: [
      "text-generation",
      "instruction-following",
      "reasoning",
      "analysis",
      "multimodal",
    ],
    recommendedFor: [
      "resume-enhancement",
      "job-matching",
      "skill-analysis",
      "quick-edits",
    ],
    isEnabled: false,
    tier: "free",
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash (Legacy)",
    description:
      "Previous generation fast model from Google, still reliable for most tasks",
    provider: "google",
    modelId: "gemini-1.5-flash",
    maxTokens: 8192,
    costPerToken: 0.000001,
    capabilities: [
      "text-generation",
      "instruction-following",
      "reasoning",
      "analysis",
      "multimodal",
    ],
    recommendedFor: [
      "resume-enhancement",
      "job-matching",
      "skill-analysis",
      "quick-edits",
    ],
    isEnabled: false,
    tier: "free",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro (Legacy)",
    description:
      "Previous generation advanced model from Google, maintained for compatibility",
    provider: "google",
    modelId: "gemini-1.5-pro",
    maxTokens: 32768,
    costPerToken: 0.000005,
    capabilities: [
      "text-generation",
      "instruction-following",
      "reasoning",
      "analysis",
      "complex-tasks",
      "multimodal",
    ],
    recommendedFor: [
      "resume-enhancement",
      "job-matching",
      "skill-analysis",
      "complex-tasks",
    ],
    isEnabled: false,
    tier: "premium",
  },
];
export const getEnabledModels = (): AIModel[] => {
  return AVAILABLE_AI_MODELS.filter((model) => model.isEnabled);
};

// Get models suitable for a specific task
export const getModelsForTask = (task: string): AIModel[] => {
  return getEnabledModels().filter(
    (model) =>
      model.recommendedFor.includes(task) || model.capabilities.includes(task)
  );
};

// Get model by ID
export const getModelById = (id: string): AIModel | undefined => {
  return AVAILABLE_AI_MODELS.find((model) => model.id === id);
};

// Default model for each task type
export const DEFAULT_MODELS = {
  "resume-enhancement": "gemini-2.5-flash", // Use latest Gemini for speed and quality
  "job-matching": "gemini-2.5-pro",
  "skill-analysis": "gemini-2.5-flash",
  "quick-edit": "distilgpt2",
} as const;

// Get a random enabled model for a task
export const getRandomModelForTask = (task: string): AIModel | undefined => {
  const models = getModelsForTask(task);
  if (models.length === 0) return undefined;
  const randomIndex = Math.floor(Math.random() * models.length);
  return models[randomIndex];
};

// Get random provider (for load balancing)
export const getRandomProvider = (): "huggingface" | "google" => {
  return Math.random() < 0.5 ? "huggingface" : "google";
};

// Get best model for task (randomly picks between top providers)
export const getBestModelForTask = (task: string): AIModel | undefined => {
  const models = getModelsForTask(task);

  // Filter by premium tier first
  const premiumModels = models.filter((m) => m.tier === "premium");
  if (premiumModels.length > 0) {
    // Randomly pick between Gemini Pro and Mistral
    const randomIndex = Math.floor(Math.random() * premiumModels.length);
    return premiumModels[randomIndex];
  }

  // Fallback to any model
  return getRandomModelForTask(task);
};

// Cost estimation utilities
export const estimateCost = (modelId: string, tokenCount: number): number => {
  const model = getModelById(modelId);
  if (!model) return 0;
  return model.costPerToken * tokenCount;
};

export const getCostTier = (modelId: string): string => {
  const model = getModelById(modelId);
  return model?.tier || "unknown";
};
