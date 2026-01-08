/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/search/ai/route";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { aiSearchRateLimiter } from "@/lib/utils/distributedRateLimit";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn(),
  attachRateLimitHeaders: jest.fn(),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
  aiSearchRateLimiter: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Cast mocks
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockHandleApiError = handleApiError as jest.MockedFunction<
  typeof handleApiError
>;
const mockAiSearchRateLimiter = aiSearchRateLimiter as jest.MockedFunction<
  typeof aiSearchRateLimiter
>;

// Mock global fetch
global.fetch = jest.fn();

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/search/ai"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/search/ai", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
    };

    // Default successful auth
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: "test-user-id",
      error: null,
    });

    // Default rate limit allowed
    mockAiSearchRateLimiter.mockResolvedValue({
      allowed: true,
      remaining: 10,
      reset: Date.now() + 1000,
    });

    // Default handleApiError implementation
    mockHandleApiError.mockImplementation(
      (error: unknown, message?: string, status = 500) => {
        return NextResponse.json({ error: message || "Error" }, { status });
      }
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return 401 if authentication fails", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = createRequest({ query: "valid query string" });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockAiSearchRateLimiter).not.toHaveBeenCalled();
  });

  it("should return 401 if userId is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue({
      userId: null,
      error: null,
    });

    const request = createRequest({ query: "valid query string" });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Please sign in to use AI search",
      401
    );
  });

  it("should return 429 if rate limit exceeded", async () => {
    mockAiSearchRateLimiter.mockResolvedValue({
      allowed: false,
      remaining: 0,
      reset: Date.now() + 1000,
    });

    const request = createRequest({ query: "valid query string" });
    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Too many requests. Please wait before searching again.",
      429
    );
  });

  it("should return 400 if query is missing", async () => {
    const request = createRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Search query is required",
      400
    );
  });

  it("should return 400 if query is too short", async () => {
    const request = createRequest({ query: "short" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Please enter a more detailed search query (at least 10 characters)",
      400
    );
  });

  it("should call cloud function and return results on success", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        result: {
          results: [],
          totalResults: 0,
          quotaRemaining: 5,
          quotaLimit: 10,
        },
      }),
    });

    const request = createRequest({ query: "experienced software engineer" });
    const response = await POST(request);
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://us-central1-test-project.cloudfunctions.net/searchResumesAI",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          data: { query: "experienced software engineer", limit: 10 },
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(data).toEqual({
      results: [],
      totalResults: 0,
      quotaRemaining: 5,
      quotaLimit: 10,
    });
  });

  it("should handle permission-denied error (quota exceeded)", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue({
        error: { message: "QUOTA_EXCEEDED" },
      }),
    });

    const request = createRequest({ query: "experienced software engineer" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Search quota exceeded",
      403
    );
  });

  it("should handle permission-denied error (tier not allowed)", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue({
        error: { message: "Tier not allowed" },
      }),
    });

    const request = createRequest({ query: "experienced software engineer" });
    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "AI search not available for your subscription tier",
      403
    );
  });

  it("should handle unauthenticated error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({
        error: { message: "Unauthenticated" },
      }),
    });

    const request = createRequest({ query: "experienced software engineer" });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Please sign in to use AI search",
      401
    );
  });

  it("should handle invalid-argument error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({
        error: { message: "Invalid arguments" },
      }),
    });

    const request = createRequest({ query: "experienced software engineer" });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Invalid search request",
      400
    );
  });

  it("should handle generic errors", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const request = createRequest({ query: "experienced software engineer" });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mockHandleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Search failed. Please try again."
    );
  });
});
