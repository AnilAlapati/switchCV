import {
  generateCsrfToken,
  createCsrfToken,
  verifyCsrfToken,
  validateCsrfToken,
} from "@/lib/middleware/csrf";
import { NextRequest, NextResponse } from "next/server";

describe("csrf middleware", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate a 64-character hex token", () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it("should create and verify a token", () => {
    const token = createCsrfToken(sessionId);
    expect(verifyCsrfToken(sessionId, token)).toBe(true);
  });

  it("should return false for invalid token", () => {
    createCsrfToken(sessionId);
    // timingSafeEqual requires same length
    const wrongToken = generateCsrfToken();
    expect(verifyCsrfToken(sessionId, wrongToken)).toBe(false);
  });

  it("should return false if token length is different", () => {
    createCsrfToken(sessionId);
    expect(verifyCsrfToken(sessionId, "short")).toBe(false);
  });

  it("should return false for expired token", () => {
    const token = createCsrfToken(sessionId);

    // Fast-forward time
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);

    expect(verifyCsrfToken(sessionId, token)).toBe(false);
  });

  describe("validateCsrfToken", () => {
    it("should pass for non-protected methods", async () => {
      const request = new NextRequest("http://localhost/api/test", {
        method: "GET",
      });
      const { valid } = await validateCsrfToken(request);
      expect(valid).toBe(true);
    });

    it("should fail if token is missing in a POST request", async () => {
      const request = new NextRequest("http://localhost/api/test", {
        method: "POST",
      });
      const { valid, error } = await validateCsrfToken(request);
      expect(valid).toBe(false);
      expect(error?.status).toBe(403);
    });
  });
});
