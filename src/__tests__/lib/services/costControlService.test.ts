import { BillingService } from "@/lib/services/billingService";
import adminDefault, { adminDb } from "@/lib/firebase-admin";

// BillingService uses the default export from @/lib/firebase-admin,
// NOT the 'firebase-admin' package directly.

describe("BillingService (trackCost + checkSystemBudget)", () => {
  const userId = "test-user-123";
  const cost = 0.05;
  const operation = "test_op";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trackCost", () => {
    it("should track cost for a user and system shards", async () => {
      await BillingService.trackCost(userId, cost, operation);

      // Verify batch was created and committed
      expect(adminDb.batch).toHaveBeenCalled();

      // Verify increment was called via the @/lib/firebase-admin default export
      const increment = (
        adminDefault as unknown as {
          firestore: { FieldValue: { increment: jest.Mock } };
        }
      ).firestore.FieldValue.increment;
      expect(increment).toHaveBeenCalledWith(cost);
      expect(increment).toHaveBeenCalledWith(1);
    });

    it("should not throw if tracking fails", async () => {
      // Mock batch().commit() to fail
      (adminDb.batch as jest.Mock).mockReturnValueOnce({
        set: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error("Firestore error")),
      });

      await expect(
        BillingService.trackCost(userId, cost, operation),
      ).resolves.not.toThrow();
    });
  });

  describe("checkSystemBudget", () => {
    it("should return true if no shards exist", async () => {
      (adminDb.collection as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      });

      const result = await BillingService.checkSystemBudget(100);
      expect(result).toBe(true);
    });

    it("should return true if total shard cost is under cap", async () => {
      (adminDb.collection as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            { data: () => ({ monthCost: 20 }) },
            { data: () => ({ monthCost: 10 }) },
            { data: () => ({ monthCost: 15 }) },
          ],
        }),
      });

      const result = await BillingService.checkSystemBudget(100);
      expect(result).toBe(true);
    });

    it("should return false if total shard cost exceeds cap", async () => {
      (adminDb.collection as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          empty: false,
          docs: [
            { data: () => ({ monthCost: 60 }) },
            { data: () => ({ monthCost: 50 }) },
            { data: () => ({ monthCost: 45 }) },
          ],
        }),
      });

      const result = await BillingService.checkSystemBudget(100);
      expect(result).toBe(false);
    });

    it("should return false (fail-closed) if an error occurs", async () => {
      (adminDb.collection as jest.Mock).mockReturnValueOnce({
        get: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      const result = await BillingService.checkSystemBudget(100);
      expect(result).toBe(false);
    });
  });
});
