

import { NextRequest } from "next/server";
import { POST } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import {
  consumeQuota,
  QuotaExceededError,
  refundQuota,
} from "@/lib/services/quotaService";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest
    .fn()
    .mockResolvedValue({ userId: "recruiter123", error: null }),
  handleApiError: jest.fn((error, message, status = 500) => ({
    status,
    json: async () => ({
      error: message,
      details:
        error instanceof Error
          ? error.message
          : error
            ? String(error)
            : undefined,
    }),
  })),
}));

jest.mock("@/lib/services/userService");
jest.mock("@/lib/services/quotaService");

// Mock config.server to avoid DB calls
jest.mock("@/lib/config.server", () => ({
  getRecruiterContactLimits: jest.fn().mockResolvedValue({
    basic: { amount: 2, interval: "lifetime" },
  }),
}));

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    firestore: {
      FieldValue: {
        increment: jest.fn(),
      },
    },
  },
}));

describe("POST /api/recruiter/request-access", () => {
  const mockRecruiterId = "recruiter123";
  const mockResumeId = "resume456";
  const mockUserId = "user789";

  const mockCollection = jest.fn();
  const mockDoc = jest.fn();
  const mockGet = jest.fn();
  const mockWhere = jest.fn();
  const mockSet = jest.fn();
  const mockUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    const mockQuery = {
      where: mockWhere,
      limit: jest.fn().mockReturnThis(), // Support .limit()
      get: mockGet,
    };

    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    mockCollection.mockReturnValue({
      add: jest.fn().mockResolvedValue({ id: "new-request-id" }), // Support .add()
      doc: mockDoc,
      where: mockWhere,
    });
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    });
    mockWhere.mockReturnValue(mockQuery);

    // Default auth
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
      error: null,
    });

    // Default tier
    (getUserTier as jest.Mock).mockResolvedValue("basic");

    // Default quota
    (consumeQuota as jest.Mock).mockResolvedValue({ remaining: 1 });
    (refundQuota as jest.Mock).mockResolvedValue({
      refunded: true,
      currentCount: 0,
    });

    // Default resume found
    mockGet.mockImplementation(async () => {
      // Check if this is a user doc or resume doc or query
      // We can distinguish by looking at what mockDoc was called with if we wanted,
      // but a simpler way is to return an object that satisfies both.
      return {
        exists: true,
        data: () => ({
          userId: mockUserId,
          title: "Resume Title",
          role: "recruiter", // For verifyRecruiterRole
        }),
        empty: true, // for query results
      };
    });
  });

  it("should create access request successfully", async () => {
    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(consumeQuota).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "recruiter_contact",
        limit: 2, // Basic limit
      })
    );
  });

  it("should block request if quota exceeded", async () => {
    (consumeQuota as jest.Mock).mockRejectedValue(
      new QuotaExceededError("Quota exceeded")
    );

    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Contact limit reached for your plan. Upgrade to contact more candidates.");
  });

  it("should return 409 if request already exists", async () => {
    // Mock existing request query
    mockGet
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ role: "recruiter" }), // verifyRecruiterRole
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ userId: mockUserId }), // resumeRef.get()
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ email: "test@example.com" }), // userRef.get()
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          empty: false, // Request exists - existingQuery.get()
        })
      );

    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);

    expect(res.status).toBe(409);
    expect(consumeQuota).not.toHaveBeenCalled();
  });

  it("should refund quota if write fails after quota reservation", async () => {
    // Sequence: recruiter profile -> resume -> user -> existingQuery(empty)
    mockGet
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ role: "recruiter" }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ userId: mockUserId }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ email: "candidate@example.com" }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          empty: true,
        })
      );

    mockSet.mockRejectedValueOnce(new Error("write failed"));

    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(consumeQuota).toHaveBeenCalledTimes(1);
    expect(refundQuota).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: mockRecruiterId,
        scope: "recruiter_contact",
        period: "lifetime",
      })
    );
  });
});
