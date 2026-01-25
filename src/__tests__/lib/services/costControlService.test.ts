import { trackCost, checkBudget } from "@/lib/services/costControlService";
import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

// The increment mock is already set up in jest.setup.js
// but we want to verify it was called.

describe("costControlService", () => {
  const userId = "test-user-123";
  const cost = 0.05;
  const operation = "test_op";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trackCost", () => {
    it("should track cost for a user and system shards", async () => {
      await trackCost(userId, cost, operation);

      // Verify batch was created and committed
      expect(adminDb.batch).toHaveBeenCalled();

      // Verify increment was called
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(cost);
      expect(admin.firestore.FieldValue.increment).toHaveBeenCalledWith(1);
    });

    it("should not throw if tracking fails", async () => {
      // Mock batch().commit() to fail
      (adminDb.batch as jest.Mock).mockReturnValueOnce({
        set: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error("Firestore error")),
      });

      await expect(trackCost(userId, cost, operation)).resolves.not.toThrow();
    });
  });

  describe("checkBudget", () => {
    it("should return true if budget doc does not exist", async () => {
      (adminDb.doc as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({ exists: false }),
      });

      const result = await checkBudget(100);
      expect(result).toBe(true);
    });

    it("should return true if current spend is under cap", async () => {
      (adminDb.doc as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ totalCost: 50 }),
        }),
      });

      const result = await checkBudget(100);
      expect(result).toBe(true);
    });

    it("should return false if current spend is over cap", async () => {
      (adminDb.doc as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ totalCost: 150 }),
        }),
      });

      const result = await checkBudget(100);
      expect(result).toBe(false);
    });

    it("should return true (fail-safe) if an error occurs", async () => {
      (adminDb.doc as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      const result = await checkBudget(100);
      expect(result).toBe(true);
    });
  });
});
