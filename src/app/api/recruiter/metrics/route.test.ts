import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
}));

import { adminDb } from "@/lib/firebase-admin";

const mockCollection = adminDb.collection as jest.MockedFunction<
  typeof adminDb.collection
>;
const mockDoc = jest.fn();
const mockGet = jest.fn();

mockCollection.mockReturnValue({
  doc: mockDoc,
} as any);

mockDoc.mockReturnValue({
  get: mockGet,
} as any);

describe("GET /api/recruiter/metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return metrics for valid userId", async () => {
    const mockMetrics = {
      totalSearches: 15,
      totalProfileViews: 42,
      accessRequests: {
        pending: 3,
        approved: 8,
        denied: 2,
      },
      totalCandidatesInteracted: 12,
      lastActivityAt: "2024-01-15T10:30:00Z",
    };

    mockGet.mockResolvedValue({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockMetrics);
    expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
    expect(mockDoc).toHaveBeenCalledWith("recruiter123");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should return default metrics when document does not exist", async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter456"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      totalSearches: 0,
      totalProfileViews: 0,
      accessRequests: {
        pending: 0,
        approved: 0,
        denied: 0,
      },
      totalCandidatesInteracted: 0,
      lastActivityAt: null,
    });
    expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
    expect(mockDoc).toHaveBeenCalledWith("recruiter456");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should return 400 when userId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "userId is required" });
    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockDoc).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should return 500 when database operation fails", async () => {
    mockGet.mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter789"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch recruiter metrics" });
    expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
    expect(mockDoc).toHaveBeenCalledWith("recruiter789");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should handle empty userId parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId="
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "userId is required" });
    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockDoc).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should handle userId with special characters", async () => {
    const mockMetrics = {
      totalSearches: 8,
      totalProfileViews: 23,
      accessRequests: {
        pending: 1,
        approved: 5,
        denied: 0,
      },
      totalCandidatesInteracted: 7,
      lastActivityAt: "2024-01-20T14:45:00Z",
    };

    mockGet.mockResolvedValue({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=recruiter-123_special@test.com"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockMetrics);
    expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
    expect(mockDoc).toHaveBeenCalledWith("recruiter-123_special@test.com");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should handle metrics with zero values", async () => {
    const mockMetrics = {
      totalSearches: 0,
      totalProfileViews: 0,
      accessRequests: {
        pending: 0,
        approved: 0,
        denied: 0,
      },
      totalCandidatesInteracted: 0,
      lastActivityAt: "2024-01-10T08:00:00Z",
    };

    mockGet.mockResolvedValue({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=new-recruiter"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockMetrics);
    expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
    expect(mockDoc).toHaveBeenCalledWith("new-recruiter");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should handle metrics with high values", async () => {
    const mockMetrics = {
      totalSearches: 999,
      totalProfileViews: 5000,
      accessRequests: {
        pending: 50,
        approved: 200,
        denied: 25,
      },
      totalCandidatesInteracted: 300,
      lastActivityAt: "2024-01-25T16:30:00Z",
    };

    mockGet.mockResolvedValue({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/recruiter/metrics?userId=active-recruiter"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockMetrics);
    expect(mockCollection).toHaveBeenCalledWith("recruiterMetrics");
    expect(mockDoc).toHaveBeenCalledWith("active-recruiter");
    expect(mockGet).toHaveBeenCalled();
  });
});
