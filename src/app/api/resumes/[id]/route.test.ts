import { NextRequest } from "next/server";
import { PUT, GET, DELETE, PATCH } from "./route";
import { getUserTier } from "@/lib/services/userService";
import {
  getResume,
  updateResume,
  deleteResume,
  trackResumeView,
} from "@/lib/services/resumeService";

// Mock services
jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/services/resumeService", () => ({
  getResume: jest.fn(),
  updateResume: jest.fn(),
  deleteResume: jest.fn(),
  trackResumeView: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
  handleApiError: jest.fn((error, message, status) => {
    return Response.json(
      { error: message, details: error?.message },
      { status: status || 500 },
    );
  }),
  maybeGetAuthenticatedUserId: jest.fn(),
  getAuthenticatedUserId: jest.fn(),
}));

jest.mock("@/lib/utils/rateLimit", () => ({
  checkRateLimit: jest.fn(),
}));

jest.mock("@/lib/security/accessMonitor", () => ({
  checkSequentialAccess: jest.fn(),
}));

import {
  maybeGetAuthenticatedUserId,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { checkSequentialAccess } from "@/lib/security/accessMonitor";

const mockGetUserTier = getUserTier as jest.Mock;
const mockGetResume = getResume as jest.Mock;
const mockUpdateResume = updateResume as jest.Mock;
const mockDeleteResume = deleteResume as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockCheckSequentialAccess = checkSequentialAccess as jest.Mock;

const buildRequest = (
  url: string,
  method: string,
  body?: Record<string, unknown>,
  headers?: HeadersInit,
) =>
  new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });

describe("PATCH /api/resumes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates resume visibility", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    mockGetResume.mockResolvedValue({ access: "owner" });
    mockUpdateResume.mockResolvedValue(undefined);

    const request = buildRequest("http://localhost/api/resumes/42", "PATCH", {
      isPublic: true,
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "42" }),
    });

    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.isPublic).toBe(true);
    expect(mockUpdateResume).toHaveBeenCalledWith(
      "42",
      "user-123",
      expect.objectContaining({
        isPublic: true,
        visibility: "public",
      }),
    );
  });

  it("returns 400 for invalid visibility state", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    const request = buildRequest("http://localhost/api/resumes/42", "PATCH", {
      isPublic: "not-a-bool",
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(400);
  });

  it("returns 403 when non-owner tries to update visibility", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-456",
    });
    mockGetResume.mockResolvedValue({ access: "granted" }); // Recruiter, not owner

    const request = buildRequest("http://localhost/api/resumes/42", "PATCH", {
      isPublic: true,
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(403);
  });

  it("returns 401 when unauthenticated user tries to patch", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const request = buildRequest("http://localhost/api/resumes/42", "PATCH", {
      isPublic: true,
    });
    const response = await PATCH(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/resumes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully deletes own resume", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    mockDeleteResume.mockResolvedValue(undefined);

    const request = buildRequest("http://localhost/api/resumes/42", "DELETE");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "42" }),
    });

    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(200);
    expect(mockDeleteResume).toHaveBeenCalledWith("42", "user-123");
  });

  it("returns 401 when unauthenticated user tries to delete", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const request = buildRequest("http://localhost/api/resumes/42", "DELETE");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(401);
  });

  it("returns 400 if ID is missing in DELETE", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    const request = buildRequest("http://localhost/api/resumes/", "DELETE");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(400);
  });

  it("returns 403 when user is not authorized to delete", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    mockDeleteResume.mockRejectedValue(new Error("Unauthorized"));

    const request = buildRequest("http://localhost/api/resumes/42", "DELETE");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "42" }),
    });

    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(403);
  });
});

describe("PUT /api/resumes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when authorization header is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: null,
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const request = buildRequest("http://localhost/api/resumes/42", "PUT", {
      resume: { title: "Updated" },
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(401);
  });

  it("returns 403 when user does not own the resume", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "another-user",
    });
    mockGetResume.mockResolvedValue({ access: "none", resume: null });

    const request = buildRequest(
      "http://localhost/api/resumes/42",
      "PUT",
      { resume: { title: "Updated" } },
      { authorization: "Bearer token" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(403);
  });

  it("returns 403 when basic user tries to edit", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    mockGetResume.mockResolvedValue({
      access: "owner",
      resume: { userId: "user-123" },
    });
    mockGetUserTier.mockResolvedValue("basic");

    const request = buildRequest(
      "http://localhost/api/resumes/42",
      "PUT",
      { resume: { title: "Updated" } },
      { authorization: "Bearer token" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Editing is not allowed");
  });

  it("updates resume content and returns updated payload", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    mockGetResume.mockResolvedValue({
      access: "owner",
      resume: { userId: "user-123", title: "Original" },
    });
    mockGetUserTier.mockResolvedValue("premium");
    mockUpdateResume.mockResolvedValue(undefined);

    const request = buildRequest(
      "http://localhost/api/resumes/42",
      "PUT",
      {
        resume: {
          title: "Updated Title",
          summary: "New summary",
        },
      },
      { authorization: "Bearer token" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.resume.title).toBe("Updated Title");

    expect(mockUpdateResume).toHaveBeenCalledWith(
      "42",
      "user-123",
      expect.objectContaining({
        title: "Updated Title",
      }),
    );
  });

  it("returns 400 for missing title in PUT body", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    mockGetResume.mockResolvedValue({
      access: "owner",
      resume: { userId: "user-123" },
    });
    mockGetUserTier.mockResolvedValue("premium");

    const request = buildRequest(
      "http://localhost/api/resumes/42",
      "PUT",
      { resume: { summary: "New summary" } }, // missing title
      { authorization: "Bearer token" },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(400);
  });

  it("returns 400 if ID is missing in PUT", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
    });
    const request = buildRequest("http://localhost/api/resumes/", "PUT", {
      resume: { title: "New" },
    });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(400);
  });
});

describe("GET /api/resumes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({ allowed: true });
    mockCheckSequentialAccess.mockResolvedValue(true);
  });

  it("returns 200 and cache headers for public resumes", async () => {
    mockGetResume.mockResolvedValue({
      access: "public_snapshot",
      resume: { title: "Public Resume" },
    });

    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300",
    );
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false });
    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(429);
  });

  it("returns 403 for sequential access violation", async () => {
    mockCheckSequentialAccess.mockResolvedValue(false);
    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("suspicious activity");
  });

  it("returns 403 for reserved ID '1'", async () => {
    const request = buildRequest("http://localhost/api/resumes/1", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "1" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 404 for non-existent resume", async () => {
    mockGetResume.mockResolvedValue({ resume: null, access: "none" });
    const request = buildRequest(
      "http://localhost/api/resumes/non-existent",
      "GET",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 200 for owner access with correct metadata", async () => {
    mockGetResume.mockResolvedValue({
      access: "owner",
      resume: { id: "42", title: "My Resume", isBeingEdited: true },
    });
    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.viewerAccess.scope).toBe("owner");
    expect(data.isBeingEdited).toBe(true);
  });

  it("returns 200 for admin access", async () => {
    mockGetResume.mockResolvedValue({
      access: "admin",
      resume: { title: "User Resume" },
    });
    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.viewerAccess.scope).toBe("admin-view");
  });

  it("returns 200 for granted (recruiter) access", async () => {
    mockGetResume.mockResolvedValue({
      access: "granted",
      resume: { title: "Shared Resume" },
    });
    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(200);
    expect(trackResumeView).toHaveBeenCalledWith("42");
  });

  it("returns 400 if ID is missing in GET", async () => {
    const request = buildRequest("http://localhost/api/resumes/", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "" }),
    });
    if (!response) throw new Error("Response is undefined");
    expect(response.status).toBe(400);
  });

  it("uses stricter rate limit for unauthenticated users", async () => {
    (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue(null);
    mockGetResume.mockResolvedValue({ access: "public_snapshot", resume: {} });

    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    await GET(request, { params: Promise.resolve({ id: "42" }) });

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("ip:"),
      expect.objectContaining({ limit: 10 }),
    );
  });

  it("uses relaxed rate limit for authenticated users", async () => {
    (maybeGetAuthenticatedUserId as jest.Mock).mockResolvedValue("user-123");
    mockGetResume.mockResolvedValue({ access: "owner", resume: {} });

    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    await GET(request, { params: Promise.resolve({ id: "42" }) });

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("user:user-123"),
      expect.objectContaining({ limit: 30 }),
    );
  });
  it("returns 403 (Default Deny) for unknown access type", async () => {
    mockGetResume.mockResolvedValue({
      access: "unknown-type",
      resume: { id: "42" }
    });
    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Permission denied");
  });

  it("handles generic service errors in GET", async () => {
    mockGetResume.mockRejectedValue(new Error("DB Connection Failed"));
    const request = buildRequest("http://localhost/api/resumes/42", "GET");
    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(500);
  });
});

// Mock NextResponse to ensure headers are passed correctly in test environment
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: (
        body: unknown,
        init: { status?: number; headers?: HeadersInit },
      ) => {
        return Response.json(body, init);
      },
    },
  };
});
