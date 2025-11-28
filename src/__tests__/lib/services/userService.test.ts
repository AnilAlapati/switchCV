import { adminDb } from "@/lib/firebase-admin";
import { getUserTier, getUserRole } from "@/lib/services/userService";

// Initial mock for production mode
jest.mock("@/lib/config", () => ({
  DEV_MODE_ENABLED: false,
  DEV_TIER_OVERRIDE: null,
  DEV_ROLE_OVERRIDE: null,
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

describe("userService", () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn(() => ({ get: mockGet }));
  const mockCollection = jest.fn(() => ({ doc: mockDoc }));

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
  });

  describe("getUserTier (Production)", () => {
    it("should return 'basic' if user document does not exist", async () => {
      mockGet.mockResolvedValue({ data: () => undefined });
      const tier = await getUserTier("user123");
      expect(tier).toBe("basic");
      expect(adminDb.collection).toHaveBeenCalledWith("users");
      expect(mockDoc).toHaveBeenCalledWith("user123");
    });

    it("should return 'basic' if subscriptionTier field is missing", async () => {
      mockGet.mockResolvedValue({ data: () => ({}) });
      const tier = await getUserTier("user123");
      expect(tier).toBe("basic");
    });

    it("should return 'basic' if subscriptionTier is invalid", async () => {
      mockGet.mockResolvedValue({
        data: () => ({ subscriptionTier: "invalid" }),
      });
      const tier = await getUserTier("user123");
      expect(tier).toBe("basic");
    });

    it("should return the correct tier if valid", async () => {
      mockGet.mockResolvedValue({
        data: () => ({ subscriptionTier: "premium" }),
      });
      const tier = await getUserTier("user123");
      expect(tier).toBe("premium");
    });
  });

  describe("getUserRole (Production)", () => {
    it("should return 'jobseeker' if user document does not exist", async () => {
      mockGet.mockResolvedValue({ data: () => undefined });
      const role = await getUserRole("user123");
      expect(role).toBe("jobseeker");
    });

    it("should return 'jobseeker' if role field is missing", async () => {
      mockGet.mockResolvedValue({ data: () => ({}) });
      const role = await getUserRole("user123");
      expect(role).toBe("jobseeker");
    });

    it("should return 'jobseeker' if role is invalid", async () => {
      mockGet.mockResolvedValue({ data: () => ({ role: "superadmin" }) });
      const role = await getUserRole("user123");
      expect(role).toBe("jobseeker");
    });

    it("should return the correct role if valid", async () => {
      mockGet.mockResolvedValue({ data: () => ({ role: "recruiter" }) });
      const role = await getUserRole("user123");
      expect(role).toBe("recruiter");
    });
  });

  describe("Dev Mode Overrides", () => {
    beforeEach(() => {
      jest.resetModules();
      jest.mock("@/lib/firebase-admin", () => ({
        adminDb: { collection: jest.fn() },
      }));
    });

    it("should use DEV_TIER_OVERRIDE when enabled", async () => {
      jest.doMock("@/lib/config", () => ({
        DEV_MODE_ENABLED: true,
        DEV_TIER_OVERRIDE: "enterprise",
        DEV_ROLE_OVERRIDE: null,
      }));
      const { getUserTier } = require("@/lib/services/userService");
      const tier = await getUserTier("user123");
      expect(tier).toBe("enterprise");
    });

    it("should use DEV_ROLE_OVERRIDE when enabled", async () => {
      jest.doMock("@/lib/config", () => ({
        DEV_MODE_ENABLED: true,
        DEV_TIER_OVERRIDE: null,
        DEV_ROLE_OVERRIDE: "admin",
      }));
      const { getUserRole } = require("@/lib/services/userService");
      const role = await getUserRole("user123");
      expect(role).toBe("admin");
    });
  });
});
