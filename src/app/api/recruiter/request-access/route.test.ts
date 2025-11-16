/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST } from "./route";

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(() => "mock-collection-ref"),
  query: jest.fn(() => "mock-query-ref"),
  where: jest.fn(() => "mock-where-ref"),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(() => ({ type: "increment", value: 1 })),
}));

import { doc, getDoc, addDoc, getDocs, updateDoc } from "firebase/firestore";

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;

describe("POST /api/recruiter/request-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create access request successfully", async () => {
    const mockResumeDoc = {
      exists: () => true,
      data: () => ({
        userId: "user-123",
        title: "Software Engineer Resume",
      }),
    };

    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        email: "candidate@example.com",
      }),
    };

    const mockExistingQuery = {
      empty: true,
      docs: [],
    };

    const mockNewRequest = {
      id: "request-456",
    };

    mockDoc
      .mockReturnValueOnce({ collection: "resumes", id: "resume-123" } as any)
      .mockReturnValueOnce({ collection: "users", id: "user-123" } as any);
    mockGetDoc
      .mockResolvedValueOnce(mockResumeDoc as any)
      .mockResolvedValueOnce(mockUserDoc as any);
    mockGetDocs.mockResolvedValue(mockExistingQuery as any);
    mockAddDoc.mockResolvedValue(mockNewRequest as any);
    mockUpdateDoc.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
          requestedFields: ["email", "phone"],
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("request-456");
    expect(data.message).toContain("Access request sent successfully");
    expect(mockDoc).toHaveBeenCalledWith({}, "resumes", "resume-123");
    expect(mockDoc).toHaveBeenCalledWith({}, "users", "user-123");
    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-collection-ref",
      expect.objectContaining({
        resumeId: "resume-123",
        userId: "user-123",
        resumeTitle: "Software Engineer Resume",
        userEmail: "candidate@example.com",
        requestedFields: ["email", "phone"],
        status: "pending",
      })
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { collection: "users", id: "user-123" },
      { requestCount: expect.any(Object) }
    );
  });

  it("should use default requestedFields when not provided", async () => {
    const mockResumeDoc = {
      exists: () => true,
      data: () => ({
        userId: "user-456",
        title: "Product Manager Resume",
      }),
    };

    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        email: "pm@example.com",
      }),
    };

    const mockExistingQuery = {
      empty: true,
      docs: [],
    };

    const mockNewRequest = {
      id: "request-789",
    };

    mockDoc.mockImplementation((db, collection, id) => ({ collection, id }));
    mockGetDoc
      .mockResolvedValueOnce(mockResumeDoc as any)
      .mockResolvedValueOnce(mockUserDoc as any);
    mockGetDocs.mockResolvedValue(mockExistingQuery as any);
    mockAddDoc.mockResolvedValue(mockNewRequest as any);
    mockUpdateDoc.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-456",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-collection-ref",
      expect.objectContaining({
        requestedFields: ["email", "phone"],
      })
    );
  });

  it("should return 400 when resumeId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("resumeId is required");
    expect(mockDoc).not.toHaveBeenCalled();
  });

  it("should return 404 when resume does not exist", async () => {
    const mockResumeDoc = {
      exists: () => false,
    };

    mockGetDoc.mockResolvedValue(mockResumeDoc as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "non-existent-resume",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should return 404 when user does not exist", async () => {
    const mockResumeDoc = {
      exists: () => true,
      data: () => ({
        userId: "non-existent-user",
        title: "Test Resume",
      }),
    };

    const mockUserDoc = {
      exists: () => false,
    };

    mockGetDoc
      .mockResolvedValueOnce(mockResumeDoc as any)
      .mockResolvedValueOnce(mockUserDoc as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("should return 409 when pending request already exists", async () => {
    const mockResumeDoc = {
      exists: () => true,
      data: () => ({
        userId: "user-123",
        title: "Test Resume",
      }),
    };

    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        email: "test@example.com",
      }),
    };

    const mockExistingQuery = {
      empty: false,
      docs: [{ id: "existing-request-123" }],
    };

    mockDoc.mockImplementation((db, collection, id) => ({ collection, id }));
    mockGetDoc
      .mockResolvedValueOnce(mockResumeDoc as any)
      .mockResolvedValueOnce(mockUserDoc as any);
    mockGetDocs.mockResolvedValue(mockExistingQuery as any);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("A pending request already exists for this resume");
    expect(data.requestId).toBe("existing-request-123");
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("should handle request count update failure gracefully", async () => {
    const mockResumeDoc = {
      exists: () => true,
      data: () => ({
        userId: "user-123",
        title: "Test Resume",
      }),
    };

    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        email: "test@example.com",
      }),
    };

    const mockExistingQuery = {
      empty: true,
      docs: [],
    };

    const mockNewRequest = {
      id: "request-999",
    };

    mockDoc.mockImplementation((db, collection, id) => ({ collection, id }));
    mockGetDoc
      .mockResolvedValueOnce(mockResumeDoc as any)
      .mockResolvedValueOnce(mockUserDoc as any);
    mockGetDocs.mockResolvedValue(mockExistingQuery as any);
    mockAddDoc.mockResolvedValue(mockNewRequest as any);
    mockUpdateDoc.mockRejectedValue(new Error("Update failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-123",
        }),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.requestId).toBe("request-999");
    // Request should still succeed even if count update fails
  });

  it("should handle malformed JSON", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: "invalid json",
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("resumeId is required");
  });

  it("should handle resume without title", async () => {
    const mockResumeDoc = {
      exists: () => true,
      data: () => ({
        userId: "user-123",
        // No title field
      }),
    };

    const mockUserDoc = {
      exists: () => true,
      data: () => ({
        email: "test@example.com",
      }),
    };

    const mockExistingQuery = {
      empty: true,
      docs: [],
    };

    const mockNewRequest = {
      id: "request-777",
    };

    mockDoc.mockImplementation((db, collection, id) => ({ collection, id }));
    mockGetDoc
      .mockResolvedValueOnce(mockResumeDoc as any)
      .mockResolvedValueOnce(mockUserDoc as any);
    mockGetDocs.mockResolvedValue(mockExistingQuery as any);
    mockAddDoc.mockResolvedValue(mockNewRequest as any);
    mockUpdateDoc.mockResolvedValue(undefined);

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/request-access",
      {
        method: "POST",
        body: JSON.stringify({
          resumeId: "resume-no-title",
        }),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockAddDoc).toHaveBeenCalledWith(
      "mock-collection-ref",
      expect.objectContaining({
        resumeTitle: "Untitled Resume",
      })
    );
  });
});
