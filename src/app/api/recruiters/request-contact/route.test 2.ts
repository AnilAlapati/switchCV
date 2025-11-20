/* eslint-disable max-lines -- Coverage-focused recruiter request tests */
import { NextRequest } from "next/server";
import { POST, GET } from "./route";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// Mock Firebase
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
}));

// Mock Firebase config
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

describe("POST /api/recruiters/request-contact", () => {
  let mockAddDoc: jest.MockedFunction<typeof addDoc>;
  let mockGetDoc: jest.MockedFunction<typeof getDoc>;
  let mockGetDocs: jest.MockedFunction<typeof getDocs>;
  let mockCollection: jest.MockedFunction<typeof collection>;
  let mockDoc: jest.MockedFunction<typeof doc>;
  let mockQuery: jest.MockedFunction<typeof query>;
  let mockWhere: jest.MockedFunction<typeof where>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
    mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
    mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
    mockCollection = collection as jest.MockedFunction<typeof collection>;
    mockDoc = doc as jest.MockedFunction<typeof doc>;
    mockQuery = query as jest.MockedFunction<typeof query>;
    mockWhere = where as jest.MockedFunction<typeof where>;

    // Mock collection and doc
    mockCollection.mockReturnValue({} as any);
    mockDoc.mockReturnValue({} as any);
    mockQuery.mockReturnValue({} as any);
    mockWhere.mockReturnValue({} as any);

    // Mock serverTimestamp
    (serverTimestamp as jest.Mock).mockReturnValue(new Date());
  });

  it("should return 400 when required fields are missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          // Missing userId, resumeId, requestedFields
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
    expect(data.required).toEqual([
      "recruiterId",
      "userId",
      "resumeId",
      "requestedFields",
    ]);
  });

  it("should return 400 when requested fields are invalid", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["invalidField"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid fields requested: invalidField");
  });

  it("should return 400 when recruiter requests their own contact info", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "user-123", // Same as userId
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Recruiters cannot request their own contact info");
  });

  it("should return 404 when resume does not exist", async () => {
    // Mock resume not found
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
    expect(data.resumeId).toBe("resume-123");
  });

  it("should return 400 when resume does not belong to specified user", async () => {
    // Mock resume exists but belongs to different user
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId: "different-user-123", // Different from payload.userId
        title: "Test Resume",
      }),
    } as any);

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Resume does not belong to specified user");
  });

  it("should return 409 when duplicate pending request exists", async () => {
    // Mock resume exists
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId: "user-123",
        title: "Test Resume",
      }),
    } as any);

    // Mock existing pending request
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [{ id: "existing-request-123" }],
    } as any);

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "You already have a pending request for this candidate"
    );
    expect(data.existingRequestId).toBe("existing-request-123");
  });

  it("should successfully create contact request", async () => {
    // Mock resume exists
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        userId: "user-123",
        title: "Test Resume",
      }),
    } as any);

    // Mock no existing requests
    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
    } as any);

    // Mock successful addDoc for request
    const mockRequestRef = { id: "request-123" };
    mockAddDoc.mockResolvedValueOnce(mockRequestRef as any);

    // Mock successful addDoc for notification
    mockAddDoc.mockResolvedValueOnce({} as any);

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          recruiterName: "John Recruiter",
          recruiterEmail: "john@company.com",
          companyName: "Tech Corp",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email", "phone"],
          purpose: "Senior Developer Position",
          proposedDuration: "1week",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0...",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("request-123");
    expect(data.status).toBe("pending_review");
    expect(data.message).toContain("submitted for admin review");

    // Verify addDoc was called twice (request + notification)
    expect(mockAddDoc).toHaveBeenCalledTimes(2);
  });

  it("should handle database errors gracefully", async () => {
    // Mock database error
    mockGetDoc.mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
          resumeId: "resume-123",
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create contact request");
    expect(data.message).toBe("Database connection failed");
  });
});

describe("GET /api/recruiters/request-contact", () => {
  let mockGetDocs: jest.MockedFunction<typeof getDocs>;
  let mockQuery: jest.MockedFunction<typeof query>;
  let mockWhere: jest.MockedFunction<typeof where>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
    mockQuery = query as jest.MockedFunction<typeof query>;
    mockWhere = where as jest.MockedFunction<typeof where>;

    mockQuery.mockReturnValue({} as any);
    mockWhere.mockReturnValue({} as any);
  });

  it("should return 400 when recruiterId is missing", async () => {
    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("recruiterId is required");
  });

  it("should successfully fetch and group requests by status", async () => {
    const mockRequests = [
      {
        id: "req-1",
        status: "pending",
        fromRecruiter: { recruiterId: "recruiter-123" },
      },
      {
        id: "req-2",
        status: "approved",
        fromRecruiter: { recruiterId: "recruiter-123" },
      },
      {
        id: "req-3",
        status: "denied",
        fromRecruiter: { recruiterId: "recruiter-123" },
      },
      {
        id: "req-4",
        status: "expired",
        fromRecruiter: { recruiterId: "recruiter-123" },
      },
    ];

    mockGetDocs.mockResolvedValue({
      docs: mockRequests.map((req) => ({
        id: req.id,
        data: () => req,
      })),
    } as any);

    const request = new NextRequest(
      "http://localhost/api/recruiters/request-contact?recruiterId=recruiter-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.recruiterId).toBe("recruiter-123");
    expect(data.requests).toHaveLength(4);
    expect(data.summary.total).toBe(4);
    expect(data.summary.pending).toBe(1);
    expect(data.summary.approved).toBe(1);
    expect(data.summary.denied).toBe(1);
    expect(data.summary.expired).toBe(1);
    expect(data.byStatus.pending).toHaveLength(1);
    expect(data.byStatus.approved).toHaveLength(1);
    expect(data.byStatus.denied).toHaveLength(1);
    expect(data.byStatus.expired).toHaveLength(1);
  });
});
