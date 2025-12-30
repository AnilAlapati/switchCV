import { NextRequest, NextResponse } from "next/server";
import * as route from "@/app/api/resumes/[id]/route";
import { adminDb } from "@/lib/firebase-admin";
import {
  fetchResumeDocument,
  handleApiError,
  maybeGetAuthenticatedUserId,
  verifyResumeOwnership,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { getResumeEditingAllowed } from "@/lib/config.server";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { checkSequentialAccess } from "@/lib/security/accessMonitor";
import { FieldValue } from "firebase-admin/firestore";

// Mock dependencies
jest.mock("@/lib/logger");
jest.mock("@/lib/utils/rateLimit");
jest.mock("@/lib/security/accessMonitor");
jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: jest.fn(),
    serverTimestamp: jest.fn(),
  },
}));

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: jest.fn(),
    serverTimestamp: jest.fn(),
  },
}));

const mockDoc = {
  get: jest.fn(),
  set: jest.fn().mockReturnValue(Promise.resolve()),
  update: jest.fn().mockReturnValue(Promise.resolve()),
  delete: jest.fn().mockReturnValue(Promise.resolve()),
  collection: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
};

const mockCollection = {
  doc: jest.fn().mockReturnValue(mockDoc),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn(),
};

jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(() => mockCollection),
  },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  fetchResumeDocument: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => {
    return { status: status || 500, json: async () => ({ error: msg }) } as any;
  }),
  maybeGetAuthenticatedUserId: jest.fn(),
  verifyResumeOwnership: jest.fn(),
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/config.server", () => ({
  getResumeEditingAllowed: jest.fn(),
}));

jest.mock("@/lib/utils/resumeEditor", () => ({
  sanitizeResumePayload: jest.fn((p) => p),
}));

jest.mock("@/lib/utils/resumeVisibility", () => ({
  sanitizeResumeForPublicView: jest.fn((p) => ({ ...p, masked: true })),
}));

describe("Resume ID API Route Coverage", () => {
  const mockResumeId = "test-resume-123";
  const mockUserId = "user-456";

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.get.mockReset();
    mockDoc.get.mockResolvedValue({ exists: true, data: () => ({}) });
    mockCollection.get.mockReset();
    mockCollection.get.mockResolvedValue({ size: 0, docs: [] });
    (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
    (checkSequentialAccess as jest.Mock).mockResolvedValue(true);
  });

  describe("GET", () => {
    it("should return 400 if ID is missing", async () => {
      const req = new NextRequest("http://localhost/api/resumes/");
      const res = await route.GET(req, { params: Promise.resolve({ id: "" }) });
      expect(res.status).toBe(400);
    });

    it("should return 403 for reserved ID 1", async () => {
      const req = new NextRequest("http://localhost/api/resumes/1");
      const res = await route.GET(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(403);
    });

    it("should return 404 if resume not found", async () => {
      (fetchResumeDocument as jest.Mock).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId);
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(404);
    });

    it("should return full resume for owner", async () => {
      const mockData = { userId: mockUserId, title: "My Resume" };
      (fetchResumeDocument as jest.Mock).mockResolvedValue({ data: mockData });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(mockUserId);

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId);
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      const json = await res.json();
      expect(json.title).toBe("My Resume");
      expect(json.viewerAccess.scope).toBe("owner");
    });

    it("should return full resume for admin", async () => {
      const mockData = { userId: "other-user", title: "Other Resume" };
      (fetchResumeDocument as jest.Mock).mockResolvedValue({ data: mockData });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("admin-user");

      mockDoc.get.mockResolvedValue({ data: () => ({ role: "admin" }) });

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId);
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      const json = await res.json();
      expect(json.viewerAccess.scope).toBe("admin-view");
    });

    it("should return full resume if access granted to recruiter", async () => {
      const mockData = { userId: "jobseeker-1", title: "JobSeeker Resume" };
      (fetchResumeDocument as jest.Mock).mockResolvedValue({ data: mockData });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("recruiter-1");

      mockDoc.get
        .mockResolvedValueOnce({ data: () => ({ role: "recruiter" }) })
        .mockResolvedValueOnce({
          size: 1,
          docs: [{ data: () => ({ toUserId: "recruiter-1", expiresAt: { toDate: () => new Date(Date.now() + 10000) } }) }]
        });

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId);
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      const json = await res.json();
      expect(json.viewerAccess.scope).toBe("full");
    });

    it("should return 403 if access grant is expired", async () => {
      const mockData = { userId: "jobseeker-1", title: "JobSeeker Resume" };
      (fetchResumeDocument as jest.Mock).mockResolvedValue({ data: mockData });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("recruiter-1");

      mockDoc.get
        .mockResolvedValueOnce({ data: () => ({ role: "recruiter" }) })
        .mockResolvedValueOnce({
          size: 1,
          docs: [{ data: () => ({ toUserId: "recruiter-1", expiresAt: new Date(Date.now() - 10000) }) }]
        });

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId);
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(403);
    });

    it("should return masked resume for public view", async () => {
      const mockData = { userId: "user-1", title: "Public Resume", isPublic: true };
      (fetchResumeDocument as jest.Mock).mockResolvedValue({ data: mockData });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId);
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      const json = await res.json();
      expect(json.masked).toBe(true);
    });

    it("should return 401 for private resume and no auth", async () => {
      const mockData = { userId: "user-1", title: "Private Resume", isPublic: false };
      (fetchResumeDocument as jest.Mock).mockResolvedValue({ data: mockData });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId);
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(401);
    });

    it("should handle view=full query param", async () => {
      const mockData = { userId: "user-1", title: "Public Resume", isPublic: true };
      (fetchResumeDocument as jest.Mock).mockResolvedValue({ data: mockData });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId + "?view=full");
      const res = await route.GET(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH", () => {
    it("should update visibility", async () => {
      (verifyResumeOwnership as jest.Mock).mockResolvedValue({
        success: true,
        docRef: mockDoc
      });

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId, {
        method: "PATCH",
        body: JSON.stringify({ isPublic: true })
      });
      const res = await route.PATCH(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(200);
    });

    it("should return 400 for invalid visibility state", async () => {
      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId, {
        method: "PATCH",
        body: JSON.stringify({ isPublic: "not-a-boolean" })
      });
      const res = await route.PATCH(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT", () => {
    it("should update resume if editing allowed", async () => {
      (verifyResumeOwnership as jest.Mock).mockResolvedValue({
        success: true,
        userId: mockUserId,
        docRef: mockDoc
      });
      (getUserTier as jest.Mock).mockResolvedValue("premium");
      (getResumeEditingAllowed as jest.Mock).mockResolvedValue({ premium: true });

      mockDoc.get.mockResolvedValue({ data: () => ({ title: "Updated" }) });

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId, {
        method: "PUT",
        body: JSON.stringify({ resume: { title: "Updated" } })
      });
      const res = await route.PUT(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(200);
    });

    it("should return 400 for invalid resume payload", async () => {
      (verifyResumeOwnership as jest.Mock).mockResolvedValue({
        success: true,
        userId: mockUserId,
        docRef: mockDoc
      });
      (getUserTier as jest.Mock).mockResolvedValue("premium");
      (getResumeEditingAllowed as jest.Mock).mockResolvedValue({ premium: true });

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId, {
        method: "PUT",
        body: JSON.stringify({ resume: "not-an-object" })
      });
      const res = await route.PUT(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(400);
    });

    it("should return 403 if editing restricted by tier", async () => {
      (verifyResumeOwnership as jest.Mock).mockResolvedValue({
        success: true,
        userId: mockUserId,
        docRef: mockDoc
      });
      (getUserTier as jest.Mock).mockResolvedValue("basic");
      (getResumeEditingAllowed as jest.Mock).mockResolvedValue({ basic: false });

      const req = new NextRequest("http://localhost/api/resumes/" + mockUserId, {
        method: "PUT",
        body: JSON.stringify({ resume: { title: "Updated" } })
      });
      const res = await route.PUT(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(403);
    });
  });

  describe("DELETE", () => {
    it("should delete resume", async () => {
      (verifyResumeOwnership as jest.Mock).mockResolvedValue({
        success: true,
        docRef: mockDoc
      });

      const req = new NextRequest("http://localhost/api/resumes/" + mockResumeId, {
        method: "DELETE"
      });
      const res = await route.DELETE(req, { params: Promise.resolve({ id: mockResumeId }) });
      expect(res.status).toBe(200);
    });
  });
});
