import {
  getAuthUser,
  verifyEmailToken,
  sendPasswordReset,
} from "@/lib/services/authService";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "timestamp",
  },
}));

jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
    generatePasswordResetLink: jest.fn(),
  },
  adminDb: {
    collection: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("AuthService", () => {
  const mockGet = jest.fn();
  const mockUpdate = jest.fn();
  const mockDoc = { ref: { update: mockUpdate }, data: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAuthUser", () => {
    it("should return user details on success", async () => {
      (adminAuth.getUser as jest.Mock).mockResolvedValue({
        uid: "uid1",
        email: "test@test.com",
        displayName: "Test User",
      });

      const user = await getAuthUser("uid1");
      expect(user).toEqual({
        uid: "uid1",
        email: "test@test.com",
        displayName: "Test User",
      });
    });

    it("should return null and log on error", async () => {
      (adminAuth.getUser as jest.Mock).mockRejectedValue(
        new Error("Auth Error"),
      );
      const user = await getAuthUser("bad-uid");
      expect(user).toBeNull();
      const { logger } = require("@/lib/logger");
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("verifyEmailToken", () => {
    const mockCollection = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: mockGet,
    }));

    beforeEach(() => {
      (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    });

    it("should successfully verify a valid token", async () => {
      const mockTokenData = {
        userId: "u123",
        expiresAt: { toMillis: () => Date.now() + 10000 },
      };
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ ...mockDoc, data: () => mockTokenData }],
      });

      const result = await verifyEmailToken("valid-token");
      expect(result.success).toBe(true);
      expect(adminAuth.updateUser).toHaveBeenCalledWith("u123", {
        emailVerified: true,
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        used: true,
        usedAt: "timestamp",
      });
    });

    it("should return error for invalid token", async () => {
      mockGet.mockResolvedValue({ empty: true });
      const result = await verifyEmailToken("invalid");
      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid-token");
    });

    it("should return error for expired token", async () => {
      const mockTokenData = {
        userId: "u123",
        expiresAt: { toMillis: () => Date.now() - 10000 },
      };
      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ ...mockDoc, data: () => mockTokenData }],
      });

      const result = await verifyEmailToken("expired");
      expect(result.success).toBe(false);
      expect(result.error).toBe("expired-token");
    });

    it("should handle error during verification", async () => {
      mockGet.mockRejectedValue(new Error("Query Fail"));
      const result = await verifyEmailToken("err");
      expect(result.success).toBe(false);
      expect(result.error).toBe("verification-failed");
    });
  });

  describe("sendPasswordReset", () => {
    it("should return link on success", async () => {
      (adminAuth.generatePasswordResetLink as jest.Mock).mockResolvedValue(
        "https://reset.link",
      );
      const result = await sendPasswordReset("test@test.com");
      expect(result).toBe("https://reset.link");
    });

    it("should throw on error", async () => {
      (adminAuth.generatePasswordResetLink as jest.Mock).mockRejectedValue(
        new Error("Email failed"),
      );
      await expect(sendPasswordReset("err@test.com")).rejects.toThrow(
        "Email failed",
      );
    });
  });
});
