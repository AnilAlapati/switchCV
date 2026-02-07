// Mock Firebase Admin BEFORE importing the service
jest.mock("@/lib/firebase-admin", () => {
  const mockSet = jest.fn().mockResolvedValue(undefined);
  const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
  return {
    adminDb: {
      collection: mockCollection,
    },
    __mocks: { mockSet, mockDoc, mockCollection },
  };
});

// Mock the logger to avoid verbose output in tests
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  sendSupportFeedback,
  SupportFeedbackError,
  getFeedbackOptions,
} from "@/lib/services/supportFeedbackService";
import { adminDb } from "@/lib/firebase-admin";

// Get mock references after import
const { __mocks } = jest.requireMock("@/lib/firebase-admin") as {
  __mocks: {
    mockSet: jest.Mock;
    mockDoc: jest.Mock;
    mockCollection: jest.Mock;
  };
};
const { mockSet, mockDoc, mockCollection } = __mocks;

// Provide necessary environment variables for the test
const ORIGINAL_ENV = process.env;

describe("supportFeedbackService", () => {
  beforeAll(() => {
    process.env = {
      ...ORIGINAL_ENV,
      SUPPORT_FEEDBACK_TO: "support@switchcv.com",
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendSupportFeedback", () => {
    it("should throw if email is missing", async () => {
      await expect(
        sendSupportFeedback({
          email: "",
          message: "This is a test message that is at least 20 chars.",
        }),
      ).rejects.toThrow(SupportFeedbackError);
    });

    it("should throw if email is invalid", async () => {
      await expect(
        sendSupportFeedback({
          email: "not-an-email",
          message: "This is a test message that is at least 20 chars.",
        }),
      ).rejects.toThrow("Enter a valid email address");
    });

    it("should throw if message is missing", async () => {
      await expect(
        sendSupportFeedback({
          email: "test@example.com",
          message: "",
        }),
      ).rejects.toThrow("cannot be empty");
    });

    it("should throw if message is too short", async () => {
      await expect(
        sendSupportFeedback({
          email: "test@example.com",
          message: "Too short",
        }),
      ).rejects.toThrow("at least 20 characters");
    });

    it("should throw for unsupported category", async () => {
      await expect(
        sendSupportFeedback({
          email: "test@example.com",
          message: "This is a valid message of sufficient length.",
          category: "invalid-category" as any,
        }),
      ).rejects.toThrow("Unsupported feedback category");
    });

    it("should throw for unsupported urgency", async () => {
      await expect(
        sendSupportFeedback({
          email: "test@example.com",
          message: "This is a valid message of sufficient length.",
          urgency: "invalid-urgency" as any,
        }),
      ).rejects.toThrow("Unsupported urgency level");
    });

    it("should successfully send feedback with minimal payload", async () => {
      const result = await sendSupportFeedback({
        email: "user@example.com",
        message: "This is a valid message of sufficient length.",
      });

      expect(result.success).toBe(true);
      expect(result.referenceId).toBeDefined();
      expect(result.referenceId).toMatch(/^FB-/);
      expect(result.deliveredTo).toBe("support@switchcv.com");
      expect(mockCollection).toHaveBeenCalledWith("mail");
      expect(mockDoc).toHaveBeenCalledWith(result.referenceId);
      expect(mockSet).toHaveBeenCalled();
    });

    it("should successfully send feedback with full payload", async () => {
      const result = await sendSupportFeedback(
        {
          name: "John Doe",
          email: "john.doe@example.com",
          category: "idea",
          urgency: "high",
          message: "I have a great idea for a feature that would help users.",
          allowContact: true,
          pageContext: "/dashboard",
        },
        {
          ipAddress: "127.0.0.1",
          userAgent: "jest-test/1.0",
        },
      );

      expect(result.success).toBe(true);
      expect(result.referenceId).toBeDefined();

      // Verify the Firestore document structure
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.to).toBe("support@switchcv.com");
      expect(setCall.replyTo).toBe("john.doe@example.com");
      expect(setCall.message.subject).toContain("Feature Idea");
      expect(setCall.feedback.category).toBe("idea");
      expect(setCall.feedback.urgency).toBe("high");
      expect(setCall.meta.ipAddress).toBe("127.0.0.1");
    });

    it("should normalize email to lowercase", async () => {
      const result = await sendSupportFeedback({
        email: "User@Example.COM",
        message: "This is a valid message of sufficient length.",
      });

      expect(result.success).toBe(true);
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.replyTo).toBe("user@example.com");
    });

    it("should sanitize name to 80 characters", async () => {
      const longName = "A".repeat(100);
      const result = await sendSupportFeedback({
        name: longName,
        email: "test@example.com",
        message: "This is a valid message of sufficient length.",
      });

      expect(result.success).toBe(true);
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.feedback.name.length).toBe(80);
    });

    it("should sanitize message to 2000 characters", async () => {
      const longMessage = "A".repeat(3000);
      const result = await sendSupportFeedback({
        email: "test@example.com",
        message: longMessage,
      });

      expect(result.success).toBe(true);
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.feedback.message.length).toBe(2000);
    });

    it("should use default category when not provided", async () => {
      const result = await sendSupportFeedback({
        email: "test@example.com",
        message: "This is a valid message of sufficient length.",
      });

      expect(result.success).toBe(true);
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.feedback.category).toBe("other");
    });

    it("should use default urgency when not provided", async () => {
      const result = await sendSupportFeedback({
        email: "test@example.com",
        message: "This is a valid message of sufficient length.",
      });

      expect(result.success).toBe(true);
      const setCall = mockSet.mock.calls[0][0];
      expect(setCall.feedback.urgency).toBe("normal");
    });

    it("should handle Firestore errors gracefully", async () => {
      mockSet.mockRejectedValueOnce(new Error("Firestore error"));

      await expect(
        sendSupportFeedback({
          email: "test@example.com",
          message: "This is a valid message of sufficient length.",
        }),
      ).rejects.toThrow("We could not send your feedback right now");
    });

    it("should return simulated result in dry run mode", async () => {
      process.env.SUPPORT_FEEDBACK_DRY_RUN = "true";

      const result = await sendSupportFeedback({
        email: "test@example.com",
        message: "This is a valid message of sufficient length.",
      });

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(true);
      expect(mockSet).not.toHaveBeenCalled();

      delete process.env.SUPPORT_FEEDBACK_DRY_RUN;
    });
  });

  describe("SupportFeedbackError", () => {
    it("should have correct default status code", () => {
      const error = new SupportFeedbackError("Test error");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("SupportFeedbackError");
    });

    it("should allow custom status code", () => {
      const error = new SupportFeedbackError("Server error", 500);
      expect(error.statusCode).toBe(500);
    });
  });

  describe("getFeedbackOptions", () => {
    it("should return categories and urgency levels", () => {
      const options = getFeedbackOptions();

      expect(options.categories).toBeDefined();
      expect(Array.isArray(options.categories)).toBe(true);
      expect(options.categories.length).toBeGreaterThan(0);

      expect(options.urgencyLevels).toBeDefined();
      expect(Array.isArray(options.urgencyLevels)).toBe(true);
      expect(options.urgencyLevels.length).toBe(3);
    });

    it("should include expected categories", () => {
      const options = getFeedbackOptions();
      const categoryValues = options.categories.map((c) => c.value);

      expect(categoryValues).toContain("bug");
      expect(categoryValues).toContain("idea");
      expect(categoryValues).toContain("data");
      expect(categoryValues).toContain("billing");
      expect(categoryValues).toContain("other");
    });

    it("should include expected urgency levels", () => {
      const options = getFeedbackOptions();
      const urgencyValues = options.urgencyLevels.map((u) => u.value);
      expect(urgencyValues).toContain("low");
      expect(urgencyValues).toContain("normal");
      expect(urgencyValues).toContain("high");
    });
  });

  describe("rate limiting", () => {
    it("should allow requests within limit", () => {
      const ip = "1.2.3.4";
      const {
        checkRateLimit,
        getRateLimitRemaining,
      } = require("@/lib/services/supportFeedbackService");
      expect(checkRateLimit(ip)).toBe(false);
      expect(getRateLimitRemaining(ip)).toBeGreaterThan(0);
    });

    it("should return false if no IP provided", () => {
      const {
        checkRateLimit,
        getRateLimitRemaining,
      } = require("@/lib/services/supportFeedbackService");
      expect(checkRateLimit(null)).toBe(false);
      expect(getRateLimitRemaining(undefined)).toBeGreaterThan(0);
    });

    it("should block after max requests", () => {
      const ip = "5.6.7.8";
      const {
        checkRateLimit,
        getRateLimitRemaining,
      } = require("@/lib/services/supportFeedbackService");
      // Current limit is 5 in code
      for (let i = 0; i < 5; i++) {
        checkRateLimit(ip);
      }
      expect(checkRateLimit(ip)).toBe(true);
      expect(getRateLimitRemaining(ip)).toBe(0);
    });

    it("should reset after window has passed", () => {
      jest.useFakeTimers();
      const ip = "9.10.11.12";
      const {
        checkRateLimit,
      } = require("@/lib/services/supportFeedbackService");
      checkRateLimit(ip);

      // Advance time by window + 1ms (1 hour = 3600000ms)
      jest.advanceTimersByTime(3600001);

      expect(checkRateLimit(ip)).toBe(false);
      jest.useRealTimers();
    });
  });

  describe("error paths", () => {
    it("should throw if support email destination is missing", async () => {
      const originalEnv = process.env.SUPPORT_FEEDBACK_TO;
      delete process.env.SUPPORT_FEEDBACK_TO;

      const config = require("@/config/constants");
      // We need to bypass the 'readonly' by cast or just acknowledge we can't easily edit a const export if it's not a mockable object.
      // But APP_CONFIG is exported as a const object. In Jest/Node we can often still mutate properties of objects unless strictly prevented.
      // Actually APP_CONFIG has 'as const' so TS will complain but JS might allowed it.
      // However, it's safer to mock it if required.

      const originalEmail = config.APP_CONFIG.SUPPORT_EMAIL;
      (config.APP_CONFIG as { SUPPORT_EMAIL: string }).SUPPORT_EMAIL = "";

      await expect(
        sendSupportFeedback({
          email: "test@example.com",
          message: "Valid message long enough",
        }),
      ).rejects.toThrow("Support email destination is not set");

      process.env.SUPPORT_FEEDBACK_TO = originalEnv;
      (config.APP_CONFIG as { SUPPORT_EMAIL: string }).SUPPORT_EMAIL =
        originalEmail;
    });
  });
});
