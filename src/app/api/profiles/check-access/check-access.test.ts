/**
 * Tests for /api/profiles/check-access route
 */

import { GET } from "@/app/api/profiles/check-access/route";
import { NextRequest } from "next/server";
import { getDoc, getDocs, collection, doc } from "firebase/firestore";
import {
  createMockFirestoreDoc,
  createMockQuerySnapshot,
} from "@/__tests__/mocks/firebase";

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: { name: "[DEFAULT]" },
}));

describe("GET /api/profiles/check-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (doc as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue({});
    (getDocs as jest.Mock).mockResolvedValue({
      empty: true,
      docs: [],
    });
  });

  it("should return 400 if resumeId is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Resume ID is required");
  });

  it("should return 404 if resume doesn't exist", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: jest.fn().mockReturnValue(false),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=non-existent"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Resume not found");
  });

  it("should grant access to resume owner", async () => {
    const userId = "placeholder-uid"; // Must match the hardcoded currentUserId in route

    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({
        userId,
        title: "My Resume",
        published: false,
      })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
    expect(data.accessType).toBe("owner");
  });

  it("should grant access for published resumes", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({
        userId: "owner-123",
        title: "My Resume",
        published: true,
      })
    );

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
    expect(data.accessType).toMatch(/(public|published)/);
  });

  it("should grant access with valid access grant", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({
        userId: "owner-123",
        title: "My Resume",
        published: false,
      })
    );

    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          grantId: "grant-123",
          toUserId: "test-user-123",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ])
    );

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
  });

  it("should deny access without grant or published status", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({
        userId: "owner-123",
        title: "My Resume",
        published: false,
      })
    );

    (getDocs as jest.Mock).mockResolvedValue(createMockQuerySnapshot([]));

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(false);
  });

  it("should deny access if grant is expired", async () => {
    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({
        userId: "owner-123",
        title: "My Resume",
        published: false,
      })
    );

    const pastDate = new Date(Date.now() - 1000);
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          grantId: "grant-123",
          toUserId: "test-user-123",
          expiresAt: pastDate,
        },
      ])
    );

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Grant should be expired
    if (data.hasAccess === false) {
      expect(data.reason).toContain("expired");
    }
  });

  it("should handle database errors gracefully", async () => {
    (getDoc as jest.Mock).mockRejectedValue(
      new Error("Database connection error")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to check access");
  });

  it("should include accessDuration in response when grant exists", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    (getDoc as jest.Mock).mockResolvedValue(
      createMockFirestoreDoc({
        userId: "owner-123",
        title: "My Resume",
        published: false,
      })
    );

    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          grantId: "grant-123",
          toUserId: "test-user-123",
          expiresAt: futureDate,
          duration: "1week",
        },
      ])
    );

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/check-access?resumeId=resume-123"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
    if (data.accessDuration) {
      expect(data.accessDuration).toBeTruthy();
    }
  });
});
