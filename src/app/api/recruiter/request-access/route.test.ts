/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";
import { adminDb } from "@/lib/firebase-admin";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => ({
    status,
    json: async () => ({ error: message, details: error.message }),
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

    (adminDb.collection as jest.Mock).mockImplementation(mockCollection);
    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
    });
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    });
    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
    });

    // Default auth
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: mockRecruiterId,
      error: null,
    });

    // Default tier
    (getUserTier as jest.Mock).mockResolvedValue("basic");

    // Default quota
    (consumeQuota as jest.Mock).mockResolvedValue({ remaining: 1 });

    // Default resume found
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ userId: mockUserId, title: "Resume Title" }),
      empty: true, // for query results
    });
  });

  it("should create access request successfully", async () => {
    const req = new NextRequest(
      "http://localhost/api/recruiter/request-access",
      {
        method: "POST",
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
        body: JSON.stringify({ resumeId: mockResumeId }),
      }
    );

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("limit of 2 contacts");
  });

  it("should return 409 if request already exists", async () => {
    // Mock existing request query
    mockGet
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ userId: mockUserId }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          exists: true,
          data: () => ({ email: "test@example.com" }),
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          empty: false, // Request exists
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
  });
});
