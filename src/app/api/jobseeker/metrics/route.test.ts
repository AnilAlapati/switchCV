import { NextRequest } from "next/server";
import { GET } from "./route";

// Mock Firebase admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
    collectionGroup: jest.fn(() => ({
      where: jest.fn(() => ({
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
      downloads: 10,
      quality: 85,
      lastUpdated: "2024-01-15T10:30:00Z",
    };

    // Mock resumes query (returns empty - no pending requests)
    mockQueryGet.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    // Mock metrics doc
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics?userId=user123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      ...mockMetrics,
      contactRequests: 0, // Computed from actual data
    });
  });

  it("should return default metrics when document does not exist", async () => {
    // Mock resumes query (returns empty)
    mockQueryGet.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    // Mock metrics doc (not exists)
    mockGet.mockResolvedValueOnce({
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
  });

  it("should return 500 when database operation fails", async () => {
    // Mock metrics doc to succeed (so we reach the query)
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({}), // No contactRequests, so it triggers the query
    });

    // Mock resumes query to fail
    mockQueryGet.mockRejectedValueOnce(new Error("Database connection failed"));

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
  });

  it("should handle userId with special characters", async () => {
    // Mock resumes query (returns empty)
    mockQueryGet.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    const mockMetrics = {
      profileViews: 15,
      downloads: 7,
      quality: 92,
      lastUpdated: "2024-01-20T14:45:00Z",
    };

    // Mock metrics doc
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => mockMetrics,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/jobseeker/metrics?userId=user-123_special@test.com"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      ...mockMetrics,
      contactRequests: 0,
    });
  });
});
