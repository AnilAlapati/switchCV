/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "@/app/api/contact/feedback/route";
import {
  sendSupportFeedback,
  SupportFeedbackError,
} from "@/lib/services/supportFeedbackService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import {
  getClientIp,
  handleApiError,
  safeParseBody,
  maybeGetAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { adminAuth } from "@/lib/firebase-admin";

jest.mock("@/lib/services/supportFeedbackService", () => {
  const actual = jest.requireActual("@/lib/services/supportFeedbackService");
  return {
    ...actual,
    sendSupportFeedback: jest.fn(),
    SupportFeedbackError: class SupportFeedbackError extends Error {
      statusCode: number;
      constructor(message: string, statusCode = 400) {
        super(message);
        this.name = "SupportFeedbackError";
        this.statusCode = statusCode;
      }
    },
  };
});
jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest
    .fn()
    .mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    }),
}));
jest.mock("@/lib/utils/api-helpers", () => {
  const { NextResponse } = require("next/server");
  return {
    getClientIp: jest.fn(),
    handleApiError: jest.fn((error, message, status) =>
      NextResponse.json(
        { error: message || "Error" },
        { status: status || 500 },
      ),
    ),
    safeParseBody: jest.fn(),
    maybeGetAuthenticatedUserId: jest.fn(),
  };
});
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    getUser: jest.fn(),
  },
}));

describe("Feedback API", () => {
  const mockRequest = new NextRequest("http://localhost/api/contact/feedback", {
    method: "POST",
    headers: { "user-agent": "test-agent" },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (getClientIp as jest.Mock).mockReturnValue("127.0.0.1");
  });

  it("should submit feedback successfully for anonymous user", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    });
    (safeParseBody as jest.Mock).mockResolvedValue({
      name: "Test User",
      email: "test@example.com",
      message: "Hello world this is a long enough message for validation",
      _formTime: 5000,
    });
    (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);
    (sendSupportFeedback as jest.Mock).mockResolvedValue({
      success: true,
      referenceId: "ref-123",
      simulated: false,
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.referenceId).toBe("ref-123");
    expect(sendSupportFeedback).toHaveBeenCalled();
  });

  it("should submit feedback successfully for authenticated user", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    });
    (safeParseBody as jest.Mock).mockResolvedValue({
      name: "Test User",
      email: "test@example.com",
      message: "Hello world this is a long enough message for validation",
      _formTime: 5000,
    });
    (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("user-123");
    (adminAuth.getUser as jest.Mock).mockResolvedValue({
      uid: "user-123",
      email: "user@example.com",
      displayName: "User 123",
    });
    (sendSupportFeedback as jest.Mock).mockResolvedValue({
      success: true,
      referenceId: "ref-123",
      simulated: true,
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.message).toContain("simulated");
    expect(adminAuth.getUser).toHaveBeenCalledWith("user-123");
  });

  it("should handle auth error gracefully in tryGetAuthenticatedUser", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    });
    (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("user-123");
    (adminAuth.getUser as jest.Mock).mockRejectedValue(new Error("Auth error"));
    (safeParseBody as jest.Mock).mockResolvedValue({
      name: "Test",
      email: "test@example.com",
      subject: "Test",
      message: "Hello world this is a long enough message for validation",
      _formTime: 5000,
    });
    (sendSupportFeedback as jest.Mock).mockResolvedValue({ success: true });

    const response = await POST(mockRequest);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(sendSupportFeedback).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ authenticatedUser: null }),
    );
  });

  it("should return 429 if rate limited", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 5,
      resetIn: 3600,
    });
    (handleApiError as jest.Mock).mockReturnValue({ status: 429 });

    const response = await POST(mockRequest);
    expect(response.status).toBe(429);
  });

  it("should handle bot protection (fast fill)", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    });
    (safeParseBody as jest.Mock).mockResolvedValue({
      email: "bot@example.com",
      message: "I am definitely a human being and not a bot at all.",
      _formTime: 100, // Too fast
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.message).toBe("Feedback received");
    expect(sendSupportFeedback).not.toHaveBeenCalled();
  });

  it("should handle SyntaxError", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    });
    (safeParseBody as jest.Mock).mockRejectedValue(
      new SyntaxError("Unexpected token"),
    );
    await POST(mockRequest);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(SyntaxError),
      "Invalid JSON payload",
      400,
    );
  });

  it("should handle SupportFeedbackError", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    });
    (safeParseBody as jest.Mock).mockResolvedValue({
      email: "test@example.com",
      message: "Valid message long enough",
      _formTime: 5000,
    });
    const error = new SupportFeedbackError("Service down", 503);
    (sendSupportFeedback as jest.Mock).mockRejectedValue(error);

    await POST(mockRequest);
    expect(handleApiError).toHaveBeenCalledWith(
      error,
      "Unable to process feedback submission",
      503,
    );
  });

  it("should handle generic error", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      remaining: 4,
      limit: 5,
      resetIn: 3600,
    });
    (safeParseBody as jest.Mock).mockRejectedValue(new Error("Generic error"));
    await POST(mockRequest);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Unable to send feedback right now",
    );
  });
});
