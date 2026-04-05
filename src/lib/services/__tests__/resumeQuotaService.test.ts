/**
 * Tests for resumeQuotaService
 *
 * Verifies that quota checks use the lifetime counter (not active count),
 * so hard-deleting a resume does NOT reset the quota.
 */
import { adminDb } from "@/lib/firebase-admin";
import {
  getLifetimeResumeCount,
  incrementLifetimeResumeCount,
  checkResumeCreationQuota,
} from "@/lib/services/resumeQuotaService";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/config.server", () => ({
  getResumeCreationLimits: jest.fn().mockResolvedValue({
    basic: 1,
    premium: 50,
    enterprise: 9999,
  }),
}));

const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockDoc = jest.fn();
const mockWhere = jest.fn();
const mockCount = jest.fn();
const mockCountGet = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();

  (adminDb.collection as jest.Mock).mockImplementation((name: string) => {
    if (name === "users") {
      return { doc: mockDoc };
    }
    return { where: mockWhere };
  });

  mockDoc.mockReturnValue({ get: mockGet, update: mockUpdate });
  mockWhere.mockReturnValue({ count: mockCount });
  mockCount.mockReturnValue({ get: mockCountGet });
  mockUpdate.mockResolvedValue(undefined);
});

// ─── getLifetimeResumeCount ───────────────────────────────────────────────────

describe("getLifetimeResumeCount", () => {
  it("returns lifetimeResumeCreations field when higher than active count", async () => {
    // User deleted their resume: active=0, lifetime=1
    mockGet.mockResolvedValue({ data: () => ({ lifetimeResumeCreations: 1 }) });
    mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });

    const result = await getLifetimeResumeCount("user1");
    expect(result).toBe(1); // Must use lifetime, NOT active
  });

  it("returns active count when field is absent (existing pre-migration users)", async () => {
    // Existing user before lifetime field was introduced: active=1, no field
    mockGet.mockResolvedValue({ data: () => ({}) });
    mockCountGet.mockResolvedValue({ data: () => ({ count: 1 }) });

    const result = await getLifetimeResumeCount("user2");
    expect(result).toBe(1); // Falls back to active count
  });

  it("returns max when active count is higher (consistency guard)", async () => {
    // Edge case: field lower than active (e.g. increment failed once)
    mockGet.mockResolvedValue({ data: () => ({ lifetimeResumeCreations: 0 }) });
    mockCountGet.mockResolvedValue({ data: () => ({ count: 2 }) });

    const result = await getLifetimeResumeCount("user3");
    expect(result).toBe(2); // Active count wins
  });

  it("returns 0 for a brand new user", async () => {
    mockGet.mockResolvedValue({ data: () => null });
    mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });

    const result = await getLifetimeResumeCount("new-user");
    expect(result).toBe(0);
  });
});

// ─── incrementLifetimeResumeCount ────────────────────────────────────────────

describe("incrementLifetimeResumeCount", () => {
  it("calls Firestore update with FieldValue.increment(1)", async () => {
    await incrementLifetimeResumeCount("user1");
    expect(mockDoc).toHaveBeenCalledWith("user1");
    expect(mockUpdate).toHaveBeenCalledWith({
      lifetimeResumeCreations: expect.anything(), // FieldValue.increment is opaque
    });
  });

  it("does not throw if Firestore update fails (non-fatal)", async () => {
    mockUpdate.mockRejectedValue(new Error("Firestore error"));
    await expect(incrementLifetimeResumeCount("user1")).resolves.not.toThrow();
  });
});

// ─── checkResumeCreationQuota ─────────────────────────────────────────────────

describe("checkResumeCreationQuota", () => {
  describe("basic tier (limit=1)", () => {
    it("allows creation when lifetime count is 0", async () => {
      mockGet.mockResolvedValue({
        data: () => ({ lifetimeResumeCreations: 0 }),
      });
      mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });

      const result = await checkResumeCreationQuota("user1", "basic");
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(0);
      expect(result.limit).toBe(1);
      expect(result.remaining).toBe(1);
    });

    it("blocks creation when lifetime count is 1 (even if active=0 after delete)", async () => {
      // This is the core bug fix scenario
      mockGet.mockResolvedValue({
        data: () => ({ lifetimeResumeCreations: 1 }),
      });
      mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) }); // deleted

      const result = await checkResumeCreationQuota("user1", "basic");
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(0);
    });

    it("blocks when existing user has active resume but no lifetime field", async () => {
      // Migration scenario: old user, lifetime field not yet set
      mockGet.mockResolvedValue({ data: () => ({}) });
      mockCountGet.mockResolvedValue({ data: () => ({ count: 1 }) });

      const result = await checkResumeCreationQuota("legacy-user", "basic");
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(1);
    });
  });

  describe("premium tier (limit=50)", () => {
    it("allows creation when lifetime count is under 50", async () => {
      mockGet.mockResolvedValue({
        data: () => ({ lifetimeResumeCreations: 25 }),
      });
      mockCountGet.mockResolvedValue({ data: () => ({ count: 20 }) });

      const result = await checkResumeCreationQuota("user2", "premium");
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(25);
      expect(result.remaining).toBe(25);
      expect(result.limit).toBe(50);
    });

    it("blocks at exactly 50", async () => {
      mockGet.mockResolvedValue({
        data: () => ({ lifetimeResumeCreations: 50 }),
      });
      mockCountGet.mockResolvedValue({ data: () => ({ count: 10 }) });

      const result = await checkResumeCreationQuota("user2", "premium");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("enterprise tier (limit=9999 = unlimited)", () => {
    it("always allows creation without hitting Firestore", async () => {
      const result = await checkResumeCreationQuota("user3", "enterprise");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9999);
      // Should NOT call Firestore for enterprise (performance optimization)
      expect(mockGet).not.toHaveBeenCalled();
      expect(mockCountGet).not.toHaveBeenCalled();
    });
  });

  describe("consistent behavior across tiers", () => {
    it("uses the same logic (lifetime count vs tier limit) for every tier", async () => {
      const tiers = [
        { tier: "basic" as const, limit: 1, current: 0, expected: true },
        { tier: "basic" as const, limit: 1, current: 1, expected: false },
        { tier: "premium" as const, limit: 50, current: 49, expected: true },
        { tier: "premium" as const, limit: 50, current: 50, expected: false },
      ];

      for (const { tier, current, expected } of tiers) {
        mockGet.mockResolvedValue({
          data: () => ({ lifetimeResumeCreations: current }),
        });
        mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });

        const result = await checkResumeCreationQuota("u", tier);
        expect(result.allowed).toBe(expected);
        expect(result.current).toBe(current);
      }
    });
  });
});
