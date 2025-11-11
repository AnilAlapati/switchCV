// src/__tests__/config/aiModels.test.ts
import {
  getEnabledModels,
  getModelsForTask,
  getModelById,
  estimateCost,
  getCostTier,
  AVAILABLE_AI_MODELS,
} from "../../config/aiModels";

describe("AI Models Configuration", () => {
  describe("getEnabledModels", () => {
    it("should return only enabled models", () => {
      const enabledModels = getEnabledModels();
      const allEnabled = enabledModels.every((model) => model.isEnabled);
      expect(allEnabled).toBe(true);
      expect(enabledModels.length).toBeGreaterThan(0);
    });

    it("should not include disabled models", () => {
      const enabledModels = getEnabledModels();
      const disabledModelIds = enabledModels.map((model) => model.id);
      const hasDisabledModel = AVAILABLE_AI_MODELS.filter(
        (model) => !model.isEnabled
      ).some((model) => disabledModelIds.includes(model.id));
      expect(hasDisabledModel).toBe(false);
    });
  });

  describe("getModelsForTask", () => {
    it("should return models recommended for resume-enhancement", () => {
      const models = getModelsForTask("resume-enhancement");
      expect(models.length).toBeGreaterThan(0);
      expect(
        models.some((model) => model.id === "mistral-7b-instruct-v0.3")
      ).toBe(true);
    });

    it("should return models with text-generation capability", () => {
      const models = getModelsForTask("text-generation");
      expect(models.length).toBeGreaterThan(0);
      expect(
        models.every((model) => model.capabilities.includes("text-generation"))
      ).toBe(true);
    });

    it("should return empty array for unknown task", () => {
      const models = getModelsForTask("unknown-task");
      expect(models).toEqual([]);
    });
  });

  describe("getModelById", () => {
    it("should return correct model for valid id", () => {
      const model = getModelById("gpt2-medium");
      expect(model).toBeDefined();
      expect(model?.id).toBe("gpt2-medium");
      expect(model?.name).toBe("GPT-2 Medium");
    });

    it("should return undefined for invalid id", () => {
      const model = getModelById("invalid-id");
      expect(model).toBeUndefined();
    });
  });

  describe("estimateCost", () => {
    it("should calculate cost correctly", () => {
      const model = getModelById("gpt2-medium");
      if (model) {
        const cost = estimateCost("gpt2-medium", 100);
        expect(cost).toBe(model.costPerToken * 100);
      }
    });

    it("should return 0 for invalid model id", () => {
      const cost = estimateCost("invalid-id", 100);
      expect(cost).toBe(0);
    });
  });

  describe("getCostTier", () => {
    it("should return correct tier for model", () => {
      const tier = getCostTier("mistral-7b-instruct-v0.3");
      expect(tier).toBe("premium");
    });

    it("should return unknown for invalid model id", () => {
      const tier = getCostTier("invalid-id");
      expect(tier).toBe("unknown");
    });
  });

  describe("AVAILABLE_AI_MODELS", () => {
    it("should have all required properties", () => {
      AVAILABLE_AI_MODELS.forEach((model) => {
        expect(model).toHaveProperty("id");
        expect(model).toHaveProperty("name");
        expect(model).toHaveProperty("description");
        expect(model).toHaveProperty("provider");
        expect(model).toHaveProperty("modelId");
        expect(model).toHaveProperty("maxTokens");
        expect(model).toHaveProperty("costPerToken");
        expect(model).toHaveProperty("capabilities");
        expect(model).toHaveProperty("recommendedFor");
        expect(model).toHaveProperty("isEnabled");
        expect(model).toHaveProperty("tier");
      });
    });

    it("should have valid provider values", () => {
      const validProviders = ["huggingface", "openai", "anthropic"];
      AVAILABLE_AI_MODELS.forEach((model) => {
        expect(validProviders).toContain(model.provider);
      });
    });

    it("should have valid tier values", () => {
      const validTiers = ["free", "paid", "premium"];
      AVAILABLE_AI_MODELS.forEach((model) => {
        expect(validTiers).toContain(model.tier);
      });
    });

    it("should have positive maxTokens", () => {
      AVAILABLE_AI_MODELS.forEach((model) => {
        expect(model.maxTokens).toBeGreaterThan(0);
      });
    });

    it("should have non-negative costPerToken", () => {
      AVAILABLE_AI_MODELS.forEach((model) => {
        expect(model.costPerToken).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
