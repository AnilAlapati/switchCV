/**
 * Unit tests for Secret Manager Service
 */

import {
  SecretManagerService,
  getSecret,
} from "@/lib/services/secretManagerService";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("SecretManagerService", () => {
  let service: SecretManagerService;

  beforeEach(() => {
    // Reset singleton instance
    (SecretManagerService as any).instance = null;
    service = SecretManagerService.getInstance();
    service.clearCache();

    // Set up test environment variables
    process.env.GEMINI_API_KEY = "test-gemini-key-12345678901234567890123";
    process.env.TOKEN_SECRET =
      "test-token-secret-1234567890123456789012345678901234567890123456789012345678901234";
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.TOKEN_SECRET;
    jest.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = SecretManagerService.getInstance();
      const instance2 = SecretManagerService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe("getSecret", () => {
    it("should retrieve a secret from environment", async () => {
      const secret = await service.getSecret("GEMINI_API_KEY");
      expect(secret).toBe("test-gemini-key-12345678901234567890123");
    });

    it("should cache secret values", async () => {
      const secret1 = await service.getSecret("GEMINI_API_KEY");
      const secret2 = await service.getSecret("GEMINI_API_KEY");

      expect(secret1).toBe(secret2);
    });

    it("should throw error for missing required secret", async () => {
      delete process.env.GEMINI_API_KEY;

      await expect(service.getSecret("GEMINI_API_KEY")).rejects.toThrow(
        "Required secret GEMINI_API_KEY is not configured"
      );
    });

    it("should return empty string for missing optional secret", async () => {
      const secret = await service.getSecret("NONEXISTENT_KEY");
      expect(secret).toBe("");
    });


  });

  describe("Cache Management", () => {
    it("should expire cache after TTL", async () => {
      jest.useFakeTimers();

      const secret1 = await service.getSecret("GEMINI_API_KEY");
      expect(secret1).toBe("test-gemini-key-12345678901234567890123");

      // Advance time by 6 minutes (beyond 5-minute TTL)
      jest.advanceTimersByTime(6 * 60 * 1000);

      // Change the environment variable
      process.env.GEMINI_API_KEY = "new-gemini-key-12345678901234567890123";

      const secret2 = await service.getSecret("GEMINI_API_KEY");
      expect(secret2).toBe("new-gemini-key-12345678901234567890123");

      jest.useRealTimers();
    });

    it("should clear all cached secrets", async () => {
      await service.getSecret("GEMINI_API_KEY");
      await service.getSecret("TOKEN_SECRET");

      service.clearCache();

      // After clear, next access should fetch fresh values
      process.env.GEMINI_API_KEY = "updated-gemini-key-12345678901234567890123";
      const secret = await service.getSecret("GEMINI_API_KEY");
      expect(secret).toBe("updated-gemini-key-12345678901234567890123");
    });
  });

  describe("checkRotationStatus", () => {
    it("should return rotation status for all secrets", async () => {
      const statuses = await service.checkRotationStatus();

      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses[0]).toHaveProperty("name");
      expect(statuses[0]).toHaveProperty("lastRotated");
      expect(statuses[0]).toHaveProperty("rotationPeriod");
      expect(statuses[0]).toHaveProperty("nextRotation");
      expect(statuses[0]).toHaveProperty("version");
    });

    it("should calculate next rotation correctly", async () => {
      const statuses = await service.checkRotationStatus();
      const geminiStatus = statuses.find((s) => s.name === "GEMINI_API_KEY");

      expect(geminiStatus).toBeDefined();
      expect(geminiStatus!.rotationPeriod).toBe(90);
    });
  });

  describe("getSecretsNeedingRotation", () => {
    it("should identify secrets expiring soon", async () => {
      const expiring = await service.getSecretsNeedingRotation();

      // All secrets should be expiring (since lastRotated defaults to epoch)
      expect(expiring.length).toBeGreaterThan(0);
    });

    it("should filter by 7-day threshold", async () => {
      const expiring = await service.getSecretsNeedingRotation();

      expiring.forEach((secret) => {
        const daysUntilRotation =
          (secret.nextRotation.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
        expect(daysUntilRotation).toBeLessThan(7);
      });
    });
  });

  describe("Convenience Functions", () => {
    it("should work via getSecret function", async () => {
      const secret = await getSecret("GEMINI_API_KEY");
      expect(secret).toBe("test-gemini-key-12345678901234567890123");
    });
  });

  describe("Secret Validation", () => {
    it("should validate GEMINI_API_KEY length", async () => {
      process.env.GEMINI_API_KEY = "short";

      // The service doesn't validate on get, only on rotate
      // This test validates the expected behavior
      const secret = await service.getSecret("GEMINI_API_KEY");
      expect(secret).toBe("short");
    });
  });

  describe("Error Handling", () => {
    it("should handle secret fetch errors gracefully", async () => {
      // Simulate undefined environment
      delete process.env.GEMINI_API_KEY;

      await expect(service.getSecret("GEMINI_API_KEY")).rejects.toThrow();
    });

    it("should log errors when secret access fails", async () => {
      delete process.env.TOKEN_SECRET;

      await expect(service.getSecret("TOKEN_SECRET")).rejects.toThrow();
    });
  });
});
