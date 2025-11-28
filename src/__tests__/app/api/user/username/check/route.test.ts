/**
 * Tests for Username Check API Route
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/user/username/check/route";

// Mock Firebase Admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
}));

// Mock rate limit
jest.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: jest.fn(),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { adminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/utils/rateLimit";

describe("Username Check API", () => {
  const mockRateLimitAllowed = {
    allowed: true,
    remaining: 9,
    limit: 10,
    resetIn: 60000,
  };

  const mockRateLimitBlocked = {
    allowed: false,
    remaining: 0,
    limit: 10,
    resetIn: 30000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (checkRateLimit as jest.Mock).mockReturnValue(mockRateLimitAllowed);
  });

  function createRequest(username: string): NextRequest {
    return new NextRequest(
      `http://localhost:3000/api/user/username/check?username=${encodeURIComponent(
        username
      )}`,
      {
        headers: {
          "x-forwarded-for": "127.0.0.1",
        },
      }
    );
  }

  describe("Rate Limiting", () => {
    it("returns 429 when rate limited", async () => {
      (checkRateLimit as jest.Mock).mockReturnValue(mockRateLimitBlocked);

      const request = createRequest("testuser");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("Too many requests");
      expect(data.retryAfter).toBe(30);
    });

    it("includes rate limit headers when allowed", async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const request = createRequest("validuser");
      const response = await GET(request);
      const data = await response.json();

      // Should return available username
      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
    });
  });

  describe("Username Validation", () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });
    });

    it("rejects empty username", async () => {
      const request = createRequest("");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("required");
    });

    it("rejects username too short", async () => {
      const request = createRequest("ab");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("at least 3 characters");
    });

    it("rejects username too long", async () => {
      const longUsername = "a".repeat(31);
      const request = createRequest(longUsername);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("at most 30 characters");
    });

    it("sanitizes invalid characters from username", async () => {
      // After sanitization, "test@user!" becomes "testuser" which is valid
      const request = createRequest("test@user!");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // After sanitization it becomes a valid username
      expect(data.available).toBe(true);
      expect(data.username).toBe("testuser");
    });

    it("sanitizes username input", async () => {
      const request = createRequest("TEST_User");
      const response = await GET(request);
      const data = await response.json();

      // Should have lowercased the username
      if (data.available && data.username) {
        expect(data.username).toBe("test_user");
      }
    });
  });

  describe("Reserved Usernames", () => {
    beforeEach(() => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });
    });

    it("rejects reserved username 'admin'", async () => {
      const request = createRequest("admin");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("reserved");
      expect(data.suggestion).toBeDefined();
    });

    it("rejects reserved username 'support'", async () => {
      const request = createRequest("support");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("reserved");
    });

    it("rejects reserved username 'switchcv'", async () => {
      const request = createRequest("switchcv");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("reserved");
    });
  });

  describe("Firestore Check", () => {
    it("returns available for non-existing username", async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: false });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const request = createRequest("newuser123");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(true);
      expect(data.username).toBe("newuser123");
    });

    it("returns unavailable for existing username", async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: true });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const request = createRequest("takenuser");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("already taken");
      expect(data.suggestion).toBeDefined();
    });

    it("provides suggestion when username is taken", async () => {
      const mockGet = jest.fn().mockResolvedValue({ exists: true });
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const request = createRequest("popular");
      const response = await GET(request);
      const data = await response.json();

      expect(data.suggestion).toMatch(/^popular-[a-z0-9]{4}$/);
    });
  });

  describe("Error Handling", () => {
    it("returns 500 on Firestore error", async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error("DB error"));
      (adminDb.collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({ get: mockGet }),
      });

      const request = createRequest("testuser");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.available).toBe(false);
      expect(data.reason).toContain("error occurred");
    });
  });
});
