import {
  BillingService,
  MODEL_PRICING,
  BUDGET_CAPS,
} from "@/lib/services/billingService";
import { adminDb } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => {
  const mockDoc = {
    get: jest.fn(),
    set: jest.fn(),
    collection: jest.fn(),
  };
  const mockCollection = {
    doc: jest.fn(() => mockDoc),
  };
  mockDoc.collection.mockReturnValue(mockCollection);

  const mockBatch = {
    set: jest.fn(),
    commit: jest.fn(),
  };

  const mockFieldValue = {
    increment: jest.fn((val) => ({ type: "increment", val })),
    serverTimestamp: jest.fn(() => "mock-timestamp"),
  };

  return {
    __esModule: true,
    adminDb: {
      collection: jest.fn(() => mockCollection),
      batch: jest.fn(() => mockBatch),
    },
    default: {
      firestore: {
        FieldValue: mockFieldValue,
      },
    },
  };
});

describe("BillingService", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateCost", () => {
    it("should calculate cost correctly for a known model", () => {
      const model = "gpt-4o";
      const inputTokens = 1000;
      const outputTokens = 1000;
      const expectedCost =
        (inputTokens / 1000) * MODEL_PRICING[model].input +
        (outputTokens / 1000) * MODEL_PRICING[model].output;

      const cost = BillingService.calculateCost(
        model,
        inputTokens,
        outputTokens,
      );
      expect(cost).toBe(expectedCost);
    });

    it("should use default pricing for unknown model", () => {
      const model = "unknown-model";
      const inputTokens = 1000;
      const outputTokens = 1000;
      const expectedCost =
        (inputTokens / 1000) * MODEL_PRICING["default"].input +
        (outputTokens / 1000) * MODEL_PRICING["default"].output;

      const cost = BillingService.calculateCost(
        model,
        inputTokens,
        outputTokens,
      );
      expect(cost).toBe(expectedCost);
    });
  });

  describe("checkBudget", () => {
    const mockDoc = adminDb.collection("").doc("") as any;

    it("should return true if budget is not exceeded", async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ totalCost: 0.05 }),
      });

      const allowed = await BillingService.checkBudget(userId, "basic");
      expect(allowed).toBe(true);
    });

    it("should return true if record doesn't exist", async () => {
      mockDoc.get.mockResolvedValue({
        exists: false,
      });

      const allowed = await BillingService.checkBudget(userId, "basic");
      expect(allowed).toBe(true);
    });

    it("should return false if budget is exceeded", async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ totalCost: BUDGET_CAPS.basic + 0.01 }),
      });

      const allowed = await BillingService.checkBudget(userId, "basic");
      expect(allowed).toBe(false);
    });

    it("should use basic budget as default if tier is missing", async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ totalCost: BUDGET_CAPS.basic - 0.001 }),
      });

      const allowed = await BillingService.checkBudget(
        userId,
        undefined as any,
      );
      expect(allowed).toBe(true);
    });

    it("should return true and log error on failure (fail open)", async () => {
      mockDoc.get.mockRejectedValue(new Error("Firebase error"));

      const allowed = await BillingService.checkBudget(userId, "basic");
      // Fail open: a transient Firestore error must not lock out users.
      // Per-hour rate limits still bound worst-case cost during an outage.
      expect(allowed).toBe(true);
    });
  });

  describe("trackUsage", () => {
    const mockBatch = adminDb.batch() as any;

    it("should track usage correctly", async () => {
      const model = "gpt-4o";
      const usage = { input: 100, output: 200 };
      const expectedCost = BillingService.calculateCost(
        model,
        usage.input,
        usage.output,
      );

      await BillingService.trackUsage(userId, model, usage);

      expect(adminDb.batch).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalledTimes(3); // Monthly, Daily, Shard
      expect(mockBatch.commit).toHaveBeenCalled();

      // Verify increment call for cost
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(
        expectedCost,
      );
    });

    it("should not throw error if tracking fails", async () => {
      mockBatch.commit.mockRejectedValue(new Error("Batch failed"));

      await expect(
        BillingService.trackUsage(userId, "model", { input: 10, output: 20 }),
      ).resolves.not.toThrow();
    });
  });
});
