/**
 * Tests for /api/profiles/search route
 */

import { POST } from "@/app/api/profiles/search/route";
import { NextRequest } from "next/server";
import { getDocs } from "firebase/firestore";
import { createMockQuerySnapshot } from "@/__tests__/mocks/firebase";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: { name: "[DEFAULT]" },
}));

describe("POST /api/profiles/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if no query or filters provided", async () => {
    const payload = { query: "", filters: {} };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("search query or filters");
  });

  it("should search profiles by name query", async () => {
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            headline: "Software Engineer",
          },
        },
        {
          uid: "user-2",
          displayName: "Jane Developer",
          publicProfile: {
            visible: true,
            headline: "Full Stack Developer",
          },
        },
      ])
    );

    const payload = {
      query: "developer",
      limit: 20,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it("should filter profiles by role", async () => {
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            role: "Frontend Developer",
          },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { role: "Frontend Developer" },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should filter profiles by location", async () => {
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            location: "San Francisco, CA",
          },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { location: "San Francisco" },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should filter profiles by skills", async () => {
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            skills: ["React", "TypeScript", "Node.js"],
          },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { skills: ["React", "TypeScript"] },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should search by slug", async () => {
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          slug: "john-developer",
          publicProfile: { visible: true },
        },
      ])
    );

    const payload = {
      query: "",
      filters: { slug: "john-developer" },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("should apply pagination with limit and offset", async () => {
    const mockDocs = Array.from({ length: 25 }, (_, i) => ({
      uid: `user-${i}`,
      displayName: `User ${i}`,
      publicProfile: { visible: true },
    }));

    (getDocs as jest.Mock).mockResolvedValue(createMockQuerySnapshot(mockDocs));

    const payload = {
      query: "user",
      limit: 10,
      offset: 5,
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it("should handle empty search results", async () => {
    (getDocs as jest.Mock).mockResolvedValue(createMockQuerySnapshot([]));

    const payload = {
      query: "nonexistent",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeDefined();
  });

  it("should handle database errors gracefully", async () => {
    (getDocs as jest.Mock).mockRejectedValue(new Error("Database error"));

    const payload = {
      query: "developer",
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });

  it("should combine multiple filters", async () => {
    (getDocs as jest.Mock).mockResolvedValue(
      createMockQuerySnapshot([
        {
          uid: "user-1",
          displayName: "John Developer",
          publicProfile: {
            visible: true,
            role: "Senior Developer",
            location: "San Francisco",
            skills: ["React", "Node.js"],
          },
        },
      ])
    );

    const payload = {
      query: "john",
      filters: {
        role: "Senior Developer",
        location: "San Francisco",
        skills: ["React"],
      },
    };

    const request = new NextRequest(
      "http://localhost:3000/api/profiles/search",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
