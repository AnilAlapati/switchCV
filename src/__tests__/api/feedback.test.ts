import { NextRequest } from "next/server";
import { POST } from "@/app/api/contact/feedback/route";
import {
  sendSupportFeedback,
  checkRateLimit,
  SupportFeedbackError,
} from "@/lib/services/supportFeedbackService";
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
    checkRateLimit: jest.fn(),
  };
});
jest.mock("@/lib/utils/api-helpers", () => ({
  getClientIp: jest.fn(),
  handleApiError: jest.fn(),
  safeParseBody: jest.fn(),
  maybeGetAuthenticatedUserId: jest.fn(),
}));
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
    (checkRateLimit as jest.Mock).mockReturnValue(false);
    (safeParseBody as jest.Mock).mockResolvedValue({
      name: "Test User",
      email: "test@example.com",
      message: "Hello",
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
    (checkRateLimit as jest.Mock).mockReturnValue(false);
    (safeParseBody as jest.Mock).mockResolvedValue({
      name: "Test User",
      email: "test@example.com",
      message: "Hello",
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
    (checkRateLimit as jest.Mock).mockReturnValue(false);
    (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("user-123");
    (adminAuth.getUser as jest.Mock).mockRejectedValue(new Error("Auth error"));
    (safeParseBody as jest.Mock).mockResolvedValue({
      name: "Test",
      email: "test@example.com",
      subject: "Test",
      message: "Test",
      _formTime: 5000,
    });
    (sendSupportFeedback as jest.Mock).mockResolvedValue({ success: true });

    const response = await POST(mockRequest);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(sendSupportFeedback).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ authenticatedUser: null })
    );
  });

  it("should return 429 if rate limited", async () => {
    (checkRateLimit as jest.Mock).mockReturnValue(true);
    (handleApiError as jest.Mock).mockReturnValue({ status: 429 });

    const response = await POST(mockRequest);
    expect(response.status).toBe(429);
  });

  it("should handle bot protection (fast fill)", async () => {
    (checkRateLimit as jest.Mock).mockReturnValue(false);
    (safeParseBody as jest.Mock).mockResolvedValue({
      _formTime: 100, // Too fast
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.message).toBe("Feedback received");
    expect(sendSupportFeedback).not.toHaveBeenCalled();
  });

  it("should handle SyntaxError", async () => {
    (checkRateLimit as jest.Mock).mockReturnValue(false);
    (safeParseBody as jest.Mock).mockRejectedValue(
      new SyntaxError("Unexpected token")
    );
    await POST(mockRequest);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(SyntaxError),
      "Invalid JSON payload",
      400
    );
  });

  it("should handle SupportFeedbackError", async () => {
    (checkRateLimit as jest.Mock).mockReturnValue(false);
    (safeParseBody as jest.Mock).mockResolvedValue({ _formTime: 5000 });
    const error = new SupportFeedbackError("Service down", 503);
    (sendSupportFeedback as jest.Mock).mockRejectedValue(error);

    await POST(mockRequest);
    expect(handleApiError).toHaveBeenCalledWith(
      error,
      "Unable to process feedback submission",
      503
    );
  });

  it("should handle generic error", async () => {
    (checkRateLimit as jest.Mock).mockReturnValue(false);
    (safeParseBody as jest.Mock).mockRejectedValue(new Error("Generic error"));
    await POST(mockRequest);
    expect(handleApiError).toHaveBeenCalledWith(
      expect.any(Error),
      "Unable to send feedback right now"
    );
  });
});
