import { NextRequest } from "next/server";
import { POST } from "./route";
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

  it("should return 400 for validation errors", async () => {
    // Test missing required fields
    const request1 = new NextRequest(
      "http://localhost/api/recruiters/request-contact",
      {
        method: "POST",
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          // Missing userId, resumeId, requestedFields
        }),
      }
    );

    const response1 = await POST(request1);
    const data1 = await response1.json();

    expect(response1.status).toBe(400);
    expect(data1.error).toBe("Missing required fields");

    // Test invalid requested fields
    const request2 = new NextRequest(
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

    const response2 = await POST(request2);
    const data2 = await response2.json();

    expect(response2.status).toBe(400);
    expect(data2.error).toBe("Invalid fields requested: invalidField");
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
    // expect(data.resumeId).toBe("resume-123");
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
    // expect(data.existingRequestId).toBe("existing-request-123");
  });

  it("should successfully create contact request", async () => {
    // Mock resume exists
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: "user-123", title: "Test Resume" }),
      } as any)
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ subscriptionTier: "premium" }),
      } as any);

    // Mock no existing requests
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] } as any);

    // Mock successful addDoc
    mockAddDoc.mockResolvedValue({ id: "request-123" } as any);

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
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("request-123");
    expect(mockAddDoc).toHaveBeenCalledTimes(2); // request + notification
  });

  it("should block basic recruiters who exceed free request limit", async () => {
    // Mock resume exists
    mockGetDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ userId: "user-123", title: "Test Resume" }),
      } as any)
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ subscriptionTier: "basic" }),
      } as any);

    // First getDocs -> duplicate check, second -> free plan active requests
    mockGetDocs
      .mockResolvedValueOnce({ empty: true, docs: [] } as any)
      .mockResolvedValueOnce({
        empty: false,
        size: 2,
        docs: [{ id: "req-1" }, { id: "req-2" }],
      } as any);

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
          requestedFields: ["email"],
          purpose: "Hiring",
          proposedDuration: "1day",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Free recruiters can request up to");
    expect(mockAddDoc).not.toHaveBeenCalled();
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
    expect(data.details).toBe("Database connection failed");
  });
});
