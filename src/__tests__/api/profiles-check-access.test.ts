import { GET } from "@/app/api/profiles/check-access/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    where: jest.fn().mockReturnThis(),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

describe("Profiles Check Access API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if not authenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it("should return 400 if resumeId is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access")
    );
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it("should return 404 if resume not found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockResolvedValue({ exists: false });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    expect(response.status).toBe(404);
  });

  it("should return owner access if user is owner", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => ({ userId: "user-1" }),
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessType).toBe("owner");
  });

  it("should return public access if resume is published", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockResolvedValue({
      exists: true,
      data: () => ({ userId: "owner-1", published: true }),
    });

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessType).toBe("public");
  });

  it("should return none if no grants found", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockResolvedValueOnce({ empty: true }); // Grants

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(false);
  });

  it("should return granted access if valid grant exists (forever)", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "grant-1",
            data: () => ({ expiresAt: null, duration: "forever" }),
          },
        ],
      }); // Grants

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessType).toBe("granted");
    expect(data.hasAccess).toBe(true);
  });

  it("should return granted access if valid grant exists (not expired)", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    const futureDate = new Date(Date.now() + 100000);
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "grant-1",
            data: () => ({ expiresAt: futureDate, duration: "1day" }),
          },
        ],
      }); // Grants

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(true);
  });

  it("should return none if all grants expired", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    const pastDate = new Date(Date.now() - 100000);
    (adminDb.get as jest.Mock)
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: "owner-1" }),
      }) // Resume
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: "grant-1",
            data: () => ({ expiresAt: pastDate, duration: "1day" }),
          },
        ],
      }); // Grants

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hasAccess).toBe(false);
  });

  it("should handle errors in GET", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-1",
      error: null,
    });
    (adminDb.get as jest.Mock).mockRejectedValue(new Error("Firestore error"));

    const req = new NextRequest(
      new URL("http://localhost:3000/api/profiles/check-access?resumeId=res-1")
    );
    const response = await GET(req);
    expect(response.status).toBe(500);
  });
});
