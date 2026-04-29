/**
 * featureFlagService.test.ts
 *
 * Tests for the feature flag service: isFeatureEnabled, getAllFlags, invalidateFlagCache.
 */
import {
  isFeatureEnabled,
  getAllFlags,
  invalidateFlagCache,
} from "@/lib/services/featureFlagService";

// ── Mocks ──────────────────────────────────────────────────────────────

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockInvalidate = jest.fn();
const mockInvalidatePattern = jest.fn();

jest.mock("@/lib/services/cacheService", () => ({
  cacheService: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    invalidate: (...args: unknown[]) => mockInvalidate(...args),
    invalidatePattern: (...args: unknown[]) => mockInvalidatePattern(...args),
  },
}));

const mockDocGet = jest.fn();
const mockCollectionGet = jest.fn();

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: mockDocGet,
      })),
      limit: jest.fn(() => ({
        get: mockCollectionGet,
      })),
    })),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: cache miss
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(undefined);
});

// ── isFeatureEnabled ───────────────────────────────────────────────────

describe("isFeatureEnabled", () => {
  it("returns true for a known default flag that is enabled (no context)", async () => {
    // "resume_v2_intake" is enabled by default, no role/tier restriction
    mockDocGet.mockResolvedValue({ exists: false });
    expect(await isFeatureEnabled("resume_v2_intake")).toBe(true);
  });

  it("returns false for a known default flag that is disabled", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(await isFeatureEnabled("resume_v2_templates")).toBe(false);
  });

  it("returns false for an unknown flag (fail-closed)", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(await isFeatureEnabled("nonexistent_flag")).toBe(false);
  });

  it("returns cached value when cache hit", async () => {
    mockGet.mockResolvedValue({ enabled: true, description: "cached" });
    expect(await isFeatureEnabled("resume_v2_intake")).toBe(true);
    // Firestore should NOT be called because cache hit
    expect(mockDocGet).not.toHaveBeenCalled();
  });

  it("fetches from Firestore and caches when cache miss + Firestore has doc", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        enabled: true,
        description: "From Firestore",
      }),
    });

    expect(await isFeatureEnabled("custom_flag")).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      "flags:custom_flag",
      { enabled: true, description: "From Firestore" },
      { ttlSeconds: 300, namespace: "flags" },
    );
  });

  it("does not cache when doc does not exist in Firestore (falls to defaults)", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    await isFeatureEnabled("resume_v2_intake");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("falls back to default when Firestore throws (and logs warning)", async () => {
    mockDocGet.mockRejectedValue(new Error("Firestore timeout"));
    // resume_v2_intake default = enabled:true
    expect(await isFeatureEnabled("resume_v2_intake")).toBe(true);
  });

  it("returns false when Firestore throws and no default exists", async () => {
    mockDocGet.mockRejectedValue(new Error("Firestore timeout"));
    expect(await isFeatureEnabled("nonexistent_flag")).toBe(false);
  });

  // ── Role restrictions ──

  it("returns true when role matches restriction", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    // "recruiter-agents" has roles: ["recruiter", "admin"]
    expect(
      await isFeatureEnabled("recruiter-agents", { role: "recruiter" }),
    ).toBe(true);
  });

  it("returns false when role does not match restriction", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(
      await isFeatureEnabled("recruiter-agents", { role: "jobseeker" }),
    ).toBe(false);
  });

  it("returns true when flag has role restriction but no role in context", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    // No role in context → role check is skipped
    expect(await isFeatureEnabled("recruiter-agents")).toBe(true);
  });

  // ── Tier restrictions ──

  it("returns true when tier matches restriction", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    // "agentic-pipeline" has tiers: ["premium", "enterprise"]
    expect(
      await isFeatureEnabled("agentic-pipeline", { tier: "enterprise" }),
    ).toBe(true);
  });

  it("enables resume file upload for premium and enterprise by default", async () => {
    mockDocGet.mockResolvedValue({ exists: false });

    await expect(
      isFeatureEnabled("resume_file_upload", { tier: "premium" }),
    ).resolves.toBe(true);
    await expect(
      isFeatureEnabled("resume_file_upload", { tier: "enterprise" }),
    ).resolves.toBe(true);
  });

  it("disables resume file upload for basic by default", async () => {
    mockDocGet.mockResolvedValue({ exists: false });

    await expect(
      isFeatureEnabled("resume_file_upload", { tier: "basic" }),
    ).resolves.toBe(false);
  });

  it("returns false when tier does not match restriction", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(await isFeatureEnabled("agentic-pipeline", { tier: "basic" })).toBe(
      false,
    );
  });

  it("returns true when flag has tier restriction but no tier in context", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(await isFeatureEnabled("agentic-pipeline")).toBe(true);
  });

  // ── Combined role + tier ──

  it("returns true when both role and tier match", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(
      await isFeatureEnabled("recruiter-agents", {
        role: "recruiter",
        tier: "premium",
      }),
    ).toBe(true);
  });

  it("returns false when role matches but tier does not", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(
      await isFeatureEnabled("recruiter-agents", {
        role: "recruiter",
        tier: "basic",
      }),
    ).toBe(false);
  });

  it("returns false when tier matches but role does not", async () => {
    mockDocGet.mockResolvedValue({ exists: false });
    expect(
      await isFeatureEnabled("recruiter-agents", {
        role: "jobseeker",
        tier: "premium",
      }),
    ).toBe(false);
  });

  // ── Firestore override scenario ──

  it("uses Firestore value over default when both exist", async () => {
    // Default "vector-search" is enabled:false
    // But Firestore says enabled:true
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ enabled: true, description: "Override" }),
    });
    expect(await isFeatureEnabled("vector-search")).toBe(true);
  });

  it("Firestore can disable a flag that defaults to enabled", async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ enabled: false, description: "Killed" }),
    });
    expect(await isFeatureEnabled("resume_v2_intake")).toBe(false);
  });
});

// ── getAllFlags ─────────────────────────────────────────────────────────

describe("getAllFlags", () => {
  it("returns all hard-coded defaults with source='default' when Firestore is empty", async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] });
    const flags = await getAllFlags();

    // Should have at least the known defaults
    expect(flags["resume_v2_intake"]).toEqual(
      expect.objectContaining({ enabled: true, source: "default" }),
    );
    expect(flags["vector-search"]).toEqual(
      expect.objectContaining({ enabled: false, source: "default" }),
    );
  });

  it("overrides defaults with Firestore values (source='firestore')", async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          id: "vector-search",
          data: () => ({ enabled: true, description: "Now live" }),
        },
        {
          id: "custom-flag",
          data: () => ({ enabled: true, description: "From DB" }),
        },
      ],
    });

    const flags = await getAllFlags();
    expect(flags["vector-search"]).toEqual(
      expect.objectContaining({ enabled: true, source: "firestore" }),
    );
    expect(flags["custom-flag"]).toEqual(
      expect.objectContaining({ enabled: true, source: "firestore" }),
    );
    // Non-overridden flag stays default
    expect(flags["resume_v2_intake"].source).toBe("default");
  });

  it("returns defaults only when Firestore fails", async () => {
    mockCollectionGet.mockRejectedValue(new Error("Firestore down"));
    const flags = await getAllFlags();
    expect(Object.keys(flags).length).toBeGreaterThan(0);
    expect(Object.values(flags).every((f) => f.source === "default")).toBe(
      true,
    );
  });
});

// ── invalidateFlagCache ────────────────────────────────────────────────

describe("invalidateFlagCache", () => {
  it("invalidates a specific flag cache key", () => {
    invalidateFlagCache("resume_v2_intake");
    expect(mockInvalidate).toHaveBeenCalledWith("flags:resume_v2_intake");
  });

  it("invalidates all flag caches when no name provided", () => {
    invalidateFlagCache();
    expect(mockInvalidatePattern).toHaveBeenCalledWith("flags:*");
  });
});
