/**
 * @jest-environment node
 */

// Mock the support feedback service - define class inline to avoid hoisting issues
jest.mock("@/lib/services/supportFeedbackService", () => ({
  sendSupportFeedback: jest.fn(),
  checkRateLimit: jest.fn().mockReturnValue(false),
  SupportFeedbackError: class SupportFeedbackError extends Error {
    statusCode: number;
    constructor(message: string, statusCode = 400) {
      super(message);
      this.name = "SupportFeedbackError";
      this.statusCode = statusCode;
    }
  },
}));

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

// Mock api-helpers
jest.mock("@/lib/utils/api-helpers", () => ({
  getClientIp: jest.fn(),
  handleApiError: jest.fn(),
  safeParseBody: jest.fn(),
  maybeGetAuthenticatedUserId: jest.fn(),
}));

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    getUser: jest.fn(),
  },
}));

import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/contact/feedback/route";
import {
  sendSupportFeedback,
  SupportFeedbackError,
} from "@/lib/services/supportFeedbackService";
import {
  getClientIp,
  handleApiError,
  safeParseBody,
  maybeGetAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

// Cast to mocked functions after import
const mockSendSupportFeedback = sendSupportFeedback as jest.MockedFunction<
  typeof sendSupportFeedback
>;
const mockGetClientIp = getClientIp as jest.MockedFunction<typeof getClientIp>;
const mockHandleApiError = handleApiError as jest.MockedFunction<
  typeof handleApiError
>;
const mockSafeParseBody = safeParseBody as jest.MockedFunction<
  typeof safeParseBody
>;
const mockMaybeGetAuthenticatedUserId =
  maybeGetAuthenticatedUserId as jest.MockedFunction<
    typeof maybeGetAuthenticatedUserId
  >;

function createRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL("http://localhost:3000/api/contact/feedback"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "jest-test/1.0",
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/contact/feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockGetClientIp.mockReturnValue("127.0.0.1");
    mockMaybeGetAuthenticatedUserId.mockResolvedValue(null);
    mockSafeParseBody.mockImplementation(async (request: Request) => {
      return request.json();
    });
    mockHandleApiError.mockImplementation(
      (error: unknown, message?: string, status = 500) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return NextResponse.json(
          { error: message || "Error", details: errorMessage },
          { status },
        );
      },
    );
  });

  it("should return success response when feedback is sent", async () => {
    mockSendSupportFeedback.mockResolvedValue({
      success: true,
      referenceId: "test-ref-123",
      deliveredTo: "support@switchcv.com",
    });

    const request = createRequest({
      email: "user@example.com",
      message: "This is a valid feedback message with enough characters.",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.referenceId).toBe("test-ref-123");
    expect(data.message).toBe("Feedback delivered to support");
  });

  it("should indicate simulated delivery when dry run", async () => {
    mockSendSupportFeedback.mockResolvedValue({
      success: true,
      referenceId: "test-ref-456",
      deliveredTo: "support@switchcv.com",
      simulated: true,
    });

    const request = createRequest({
      email: "user@example.com",
      message: "This is a valid feedback message with enough characters.",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.simulated).toBe(true);
    expect(data.message).toBe("Feedback captured (email delivery simulated)");
  });

  it("should return 400 for invalid JSON", async () => {
    mockSafeParseBody.mockRejectedValue(new SyntaxError("Unexpected token"));

    const request = createRequest({});

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid JSON");
  });

  it("should return validation error from service", async () => {
    const validationError = new SupportFeedbackError("Email is required", 400);
    mockSendSupportFeedback.mockRejectedValue(validationError);

    const request = createRequest({
      email: "",
      message: "Some message",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid feedback submission");
  });

  it("should return 500 for unexpected errors", async () => {
    mockSendSupportFeedback.mockRejectedValue(new Error("Unexpected error"));

    const request = createRequest({
      email: "user@example.com",
      message: "This is a valid feedback message with enough characters.",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Unable to send feedback right now");
  });

  it("should pass metadata to service", async () => {
    mockSendSupportFeedback.mockResolvedValue({
      success: true,
      referenceId: "test-ref-789",
      deliveredTo: "support@switchcv.com",
    });

    const request = createRequest({
      email: "user@example.com",
      message: "This is a valid feedback message with enough characters.",
      category: "bug",
      urgency: "high",
    });

    await POST(request);

    expect(mockSendSupportFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        category: "bug",
        urgency: "high",
      }),
      expect.objectContaining({
        ipAddress: "127.0.0.1",
        userAgent: "jest-test/1.0",
      }),
    );
  });
});
