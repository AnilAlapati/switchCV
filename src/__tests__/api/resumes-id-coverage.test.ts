// Mock dependencies BEFORE imports to avoid circular reference
jest.mock("@/lib/logger");
jest.mock("@/lib/utils/rateLimit");
jest.mock("@/lib/security/accessMonitor");

jest.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: jest.fn(),
    serverTimestamp: jest.fn(),
  },
}));

jest.mock("@/lib/firebase-admin", () => {
  const mDoc = {
    get: jest.fn(),
    set: jest.fn().mockReturnValue(Promise.resolve()),
    update: jest.fn().mockReturnValue(Promise.resolve()),
    delete: jest.fn().mockReturnValue(Promise.resolve()),
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
  };

  const mCollection = {
    doc: jest.fn().mockReturnValue(mDoc),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };

  return {
    adminDb: {
      collection: jest.fn(() => mCollection),
    },
  };
});

import { NextRequest, NextResponse } from "next/server";
import * as route from "@/app/api/resumes/[id]/route";
jest.mock("@/lib/services/resumeService", () => ({
  getResume: jest.fn(),
  updateResume: jest.fn(),
  deleteResume: jest.fn(),
  trackResumeView: jest.fn(),
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((err, msg, status) => {
    return { status: status || 500, json: async () => ({ error: msg }) } as any;
  }),
  maybeGetAuthenticatedUserId: jest.fn(),
  getAuthenticatedUserId: jest.fn(),
}));

import { getResume, updateResume, deleteResume, trackResumeView } from "@/lib/services/resumeService";
import { getUserTier } from "@/lib/services/userService";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { checkSequentialAccess } from "@/lib/security/accessMonitor";
import { FieldValue } from "firebase-admin/firestore";
import { maybeGetAuthenticatedUserId, getAuthenticatedUserId } from "@/lib/utils/api-helpers";

// ... existing mocks for userService, config.server, resumeEditor, resumeVisibility ...

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
    (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
    (checkSequentialAccess as jest.Mock).mockResolvedValue(true);
  });

  describe("GET", () => {
    it("should return 400 if ID is missing", async () => {
      const req = new NextRequest("http://localhost/api/resumes/");
      const res = await route.GET(req, { params: Promise.resolve({ id: "" }) });
      expect(res!.status).toBe(400);
    });

    it("should return 403 for reserved ID 1", async () => {
      const req = new NextRequest("http://localhost/api/resumes/1");
      const res = await route.GET(req, {
        params: Promise.resolve({ id: "1" }),
      });
      expect(res!.status).toBe(403);
    });

    it("should return 404 if resume not found", async () => {
      (getResume as jest.Mock).mockResolvedValue({ resume: null, access: "none" });
      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res.status).toBe(404);
    });

    it("should return full resume for owner", async () => {
      const mockData = { userId: mockUserId, title: "My Resume" };
      (getResume as jest.Mock).mockResolvedValue({ resume: mockData, access: "owner" });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(mockUserId);

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      const json = await res.json();
      expect(json.title).toBe("My Resume");
      expect(json.viewerAccess.scope).toBe("owner");
    });

    it("should return full resume for admin", async () => {
      const mockData = { userId: "other-user", title: "Other Resume" };
      (getResume as jest.Mock).mockResolvedValue({ resume: mockData, access: "admin" });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("admin-user");

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      const json = await res.json();
      expect(json.viewerAccess.scope).toBe("admin-view");
    });

    it("should return full resume if access granted to recruiter", async () => {
      const mockData = { userId: "jobseeker-1", title: "JobSeeker Resume" };
      (getResume as jest.Mock).mockResolvedValue({ resume: mockData, access: "granted" });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("recruiter-1");

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      const json = await res.json();
      expect(json.viewerAccess.scope).toBe("full");
    });

    it("should return 404 if access denied", async () => {
      // The current route logic returns 404 if access is "none"
      const mockData = { userId: "jobseeker-1", title: "JobSeeker Resume" };
      (getResume as jest.Mock).mockResolvedValue({ resume: mockData, access: "none" });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("recruiter-1");

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res.status).toBe(404);
    });

    it("should return public snapshot", async () => {
      const mockData = {
        userId: "user-1",
        title: "Public Resume",
        isPublic: true,
      };
      (getResume as jest.Mock).mockResolvedValue({ resume: mockData, access: "public_snapshot" });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res!.status).toBe(200);
      const json = await res.json();
      expect(json.title).toBe("Public Resume");
    });

    it("should return 404 for private resume and no auth", async () => {
      const mockData = {
        userId: "user-1",
        title: "Private Resume",
        isPublic: false,
      };
      (getResume as jest.Mock).mockResolvedValue({ resume: null, access: "none" });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res.status).toBe(404);
    });

    it("should handle view=full query param", async () => {
      const mockData = {
        userId: "user-1",
        title: "Public Resume",
        isPublic: true,
      };
      (getResume as jest.Mock).mockResolvedValue({ resume: mockData, access: "public_snapshot" });
      (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId + "?view=full"
      );
      const res = await route.GET(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      // The current route logic returns 200 for public snapshot even if view=full is requested (it just ignores it or returns what it has)
      // Actually, looking at the route, it returns public_snapshot regardless of the view param if that's the access level.
      expect(res!.status).toBe(200);
    });
  });

  describe("PATCH", () => {
    it("should update visibility", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
      (getResume as jest.Mock).mockResolvedValue({ resume: {}, access: "owner" });
      (updateResume as jest.Mock).mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId,
        {
          method: "PATCH",
          body: JSON.stringify({ isPublic: true }),
        }
      );
      const res = await route.PATCH(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res!.status).toBe(200);
    });

    it("should return 400 for invalid visibility state", async () => {
      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId,
        {
          method: "PATCH",
          body: JSON.stringify({ isPublic: "not-a-boolean" }),
        }
      );
      const res = await route.PATCH(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res!.status).toBe(400);
    });
  });

  describe("PUT", () => {
    it("should update resume if editing allowed", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
      (getResume as jest.Mock).mockResolvedValue({ resume: { title: "Old" }, access: "owner" });
      (getUserTier as jest.Mock).mockResolvedValue("premium");
      (updateResume as jest.Mock).mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId,
        {
          method: "PUT",
          body: JSON.stringify({ resume: { title: "Updated" } }),
        }
      );
      const res = await route.PUT(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res!.status).toBe(200);
    });

    it("should return 400 for invalid resume payload", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
      (getResume as jest.Mock).mockResolvedValue({ resume: {}, access: "owner" });
      (getUserTier as jest.Mock).mockResolvedValue("premium");

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId,
        {
          method: "PUT",
          body: JSON.stringify({ resume: "not-an-object" }),
        }
      );
      const res = await route.PUT(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res!.status).toBe(400);
    });

    it("should return 403 if editing restricted by tier", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
      (getResume as jest.Mock).mockResolvedValue({ resume: {}, access: "owner" });
      (getUserTier as jest.Mock).mockResolvedValue("basic");

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockUserId,
        {
          method: "PUT",
          body: JSON.stringify({ resume: { title: "Updated" } }),
        }
      );
      const res = await route.PUT(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res!.status).toBe(403);
    });
  });

  describe("DELETE", () => {
    it("should delete resume", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
      (deleteResume as jest.Mock).mockResolvedValue(undefined);

      const req = new NextRequest(
        "http://localhost/api/resumes/" + mockResumeId,
        {
          method: "DELETE",
        }
      );
      const res = await route.DELETE(req, {
        params: Promise.resolve({ id: mockResumeId }),
      });
      expect(res!.status).toBe(200);
    });
  });
});
