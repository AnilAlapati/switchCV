import { adminDb } from "@/lib/firebase-admin";
import {
  getUserTier,
  getUserRole,
  verifyAdminRole,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  setUserRole,
} from "@/lib/services/userService";
import { userTierCache, userRoleCache } from "@/lib/utils/cache";

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
  const mockSet = jest.fn();
  const mockDoc = jest.fn(() => ({ get: mockGet, set: mockSet }));
  const mockCollection = jest.fn(() => ({ doc: mockDoc }));

  beforeEach(() => {
    jest.clearAllMocks();
    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    userTierCache.clear();
    userRoleCache.clear();

    mockSet.mockResolvedValue(undefined);
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

  describe("Caching", () => {
    it("should cache the tier result", async () => {
      mockGet.mockResolvedValue({
        data: () => ({ subscriptionTier: "premium" }),
      });
      await getUserTier("user123");
      await getUserTier("user123");

      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("should cache the role result", async () => {
      mockGet.mockResolvedValue({ data: () => ({ role: "recruiter" }) });
      await getUserRole("user-role-123");
      await getUserRole("user-role-123");

      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  describe("verifyAdminRole", () => {
    it("should return true if user is admin", async () => {
      mockGet.mockResolvedValue({ data: () => ({ role: "admin" }) });
      const isAdmin = await verifyAdminRole("admin-uid");
      expect(isAdmin).toBe(true);
    });

    it("should return false if user is jobseeker", async () => {
      mockGet.mockResolvedValue({ data: () => ({ role: "jobseeker" }) });
      const isAdmin = await verifyAdminRole("job-uid");
      expect(isAdmin).toBe(false);
    });
  });

  describe("getUserProfile", () => {
    it("should return data if user exists", async () => {
      const mockData = { email: "test@test.com", displayName: "Test User" };
      mockGet.mockResolvedValue({ exists: true, data: () => mockData });
      const profile = await getUserProfile("u1");
      expect(profile).toEqual(mockData);
    });

    it("should return null if user missing", async () => {
      mockGet.mockResolvedValue({ exists: false });
      const profile = await getUserProfile("missing");
      expect(profile).toBeNull();
    });
  });

  describe("createUserProfile", () => {
    it("should successfully create a valid profile", async () => {
      const input = {
        uid: "new-uid",
        email: "new@test.com",
        displayName: "New User",
        companyName: "Corp",
      };
      const result = await createUserProfile(input);

      expect(result).toHaveProperty("uid", "new-uid");
      expect(result).toHaveProperty("subscriptionTier", "basic");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@test.com" }),
        { merge: true },
      );
    });

    it("should throw error on invalid input", async () => {
      const input = { uid: "", email: "bad-email" } as any;
      await expect(createUserProfile(input)).rejects.toThrow(
        "Validation failed",
      );
    });
  });

  describe("updateUserProfile", () => {
    it("should successfully update profile", async () => {
      const result = await updateUserProfile("uid1", {
        displayName: "Updated Name",
      });
      expect(result).toHaveProperty("displayName", "Updated Name");
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: "Updated Name" }),
        { merge: true },
      );
    });

    it("should throw error on invalid update", async () => {
      await expect(updateUserProfile("", {} as any)).rejects.toThrow(
        "Validation failed",
      );
    });
  });

  describe("setUserRole", () => {
    it("should set recruiter role correctly", async () => {
      const result = await setUserRole("u1", "recruiter");
      expect(result.role).toBe("recruiter");
      expect(result.isRecruiter).toBe(true);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ role: "recruiter", isRecruiter: true }),
        { merge: true },
      );
    });

    it("should set jobseeker role correctly", async () => {
      const result = await setUserRole("u1", "jobseeker");
      expect(result.role).toBe("jobseeker");
      expect(result.isRecruiter).toBe(false);
    });
  });
});
