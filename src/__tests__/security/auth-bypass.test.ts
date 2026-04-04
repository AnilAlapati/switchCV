/**
 * Authentication Bypass Security Tests
 *
 * Validates that getAuthenticatedUserId properly rejects unauthenticated
 * and malformed requests.
 */

import { NextRequest } from "next/server";

// Use the global mock from jest.setup.js for firebase-admin
// Only need to mock additional modules that api-helpers imports
jest.mock("@/lib/utils/cors", () => ({
  validateCorsOrigin: jest.fn().mockReturnValue({ allowed: true }),
  createCorsHeaders: jest.fn().mockReturnValue(new Headers()),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { adminAuth } from "@/lib/firebase-admin";

const mockVerifyIdToken = adminAuth.verifyIdToken as jest.Mock;

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  const h = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    h.set(key, value);
  }
  return new NextRequest("http://localhost:3000/api/test", { headers: h });
}

describe("Auth Bypass Protection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when no Authorization header is present", async () => {
    const req = makeRequest();
    const result = await getAuthenticatedUserId(req);

    expect(result.error).toBeDefined();
    expect(result.userId).toBeUndefined();
    expect(result.error!.status).toBe(401);
  });

  it("should return 401 when Authorization header is not Bearer", async () => {
    const req = makeRequest({ authorization: "Basic dXNlcjpwYXNz" });
    const result = await getAuthenticatedUserId(req);

    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });

  it("should return 401 for empty Bearer token", async () => {
    const req = makeRequest({ authorization: "Bearer " });
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

    const result = await getAuthenticatedUserId(req);

    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });

  it("should return 401 for expired/invalid token", async () => {
    const req = makeRequest({ authorization: "Bearer expired-token-xyz" });
    mockVerifyIdToken.mockRejectedValue(new Error("Token has expired"));

    const result = await getAuthenticatedUserId(req);

    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });

  it("should NOT leak error details in 401 response", async () => {
    const req = makeRequest({ authorization: "Bearer bad" });
    mockVerifyIdToken.mockRejectedValue(
      new Error(
        "Firebase: Error (auth/id-token-expired). Internal URL: https://firebase.google.com/...",
      ),
    );

    const result = await getAuthenticatedUserId(req);

    expect(result.error).toBeDefined();
    const body = await result.error!.json();
    // Should return generic message, not the Firebase error
    expect(body.error).not.toContain("Firebase");
    expect(body.error).not.toContain("Internal URL");
    expect(body.error).toBe("Invalid token");
  });

  it("should return userId on valid token", async () => {
    const req = makeRequest({ authorization: "Bearer valid-token-123" });
    mockVerifyIdToken.mockResolvedValue({ uid: "user-abc" });

    const result = await getAuthenticatedUserId(req);

    expect(result.userId).toBe("user-abc");
    expect(result.error).toBeUndefined();
  });

  it("should call verifyIdToken with the extracted token", async () => {
    const req = makeRequest({ authorization: "Bearer my-jwt-token" });
    mockVerifyIdToken.mockResolvedValue({ uid: "user-123" });

    await getAuthenticatedUserId(req);

    expect(mockVerifyIdToken).toHaveBeenCalledWith("my-jwt-token");
  });

  it("should reject when Authorization header has only 'Bearer' with no token", async () => {
    // "Bearer" with a trailing space but no actual token
    const req = makeRequest({ authorization: "Bearer" });
    const result = await getAuthenticatedUserId(req);

    // Should fail because "Bearer" doesn't start with "Bearer "
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(401);
  });
});
