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
const mockWhere = jest.fn();
const mockCount = jest.fn();
const mockQueryGet = jest.fn();

mockCollection.mockReturnValue({
  doc: mockDoc,
  where: mockWhere,
} as any);

mockDoc.mockReturnValue({
  get: mockGet,
  set: jest.fn(),
} as any);

mockWhere.mockReturnValue({
  get: mockQueryGet,
  count: mockCount,
} as any);

mockCount.mockReturnValue({
  get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) }),
} as any);

describe("GET /api/jobseeker/metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default query response (empty)
    mockQueryGet.mockResolvedValue({
      empty: true,
      docs: [],
    });
  });

  it("should return metrics for valid userId", async () => {
    const mockMetrics = {
      profileViews: 25,
      contactRequests: 5,
      downloads: 10,
      quality: 85,
      lastUpdated: "2024-01-15T10:30:00Z",
    };

    mockGet.mockResolvedValue({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics?userId=user123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockMetrics);
    expect(mockCollection).toHaveBeenCalledWith("jobSeekerMetrics");
    expect(mockDoc).toHaveBeenCalledWith("user123");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should return default metrics when document does not exist", async () => {
    mockGet.mockResolvedValue({
      exists: false,
      data: () => null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics?userId=user456"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      profileViews: 0,
      contactRequests: 0,
      downloads: 0,
      quality: 0,
      lastUpdated: null,
    });
    expect(mockCollection).toHaveBeenCalledWith("jobSeekerMetrics");
    expect(mockDoc).toHaveBeenCalledWith("user456");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should return 400 when userId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "userId is required",
    });
    expect(mockCollection).not.toHaveBeenCalled();
  });

  it("should return 500 when database operation fails", async () => {
    mockGet.mockRejectedValue(new Error("Database connection failed"));

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics?userId=user789"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch job seeker metrics",
      details: "Database connection failed",
    });
    expect(mockCollection).toHaveBeenCalledWith("jobSeekerMetrics");
    expect(mockDoc).toHaveBeenCalledWith("user789");
    expect(mockGet).toHaveBeenCalled();
  });

  it("should handle empty userId parameter", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics?userId="
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "userId is required",
    });
    expect(mockCollection).not.toHaveBeenCalled();
    expect(mockDoc).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("should handle userId with special characters", async () => {
    const mockMetrics = {
      profileViews: 15,
      contactRequests: 3,
      downloads: 7,
      quality: 92,
      lastUpdated: "2024-01-20T14:45:00Z",
    };

    mockGet.mockResolvedValue({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics?userId=user-123_special@test.com"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockMetrics);
    expect(mockCollection).toHaveBeenCalledWith("jobSeekerMetrics");
    expect(mockDoc).toHaveBeenCalledWith("user-123_special@test.com");
    expect(mockGet).toHaveBeenCalled();
  });
});
