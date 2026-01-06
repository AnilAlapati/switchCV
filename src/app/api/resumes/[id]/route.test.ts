import { NextRequest } from "next/server";
import { PUT, GET } from "./route";
import { getUserTier } from "@/lib/services/userService";
import {
  getResume,
  updateResume,
  deleteResume,
  trackResumeView
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
    return Response.json({ error: message, details: error?.message }, { status: status || 500 });
  }),
  maybeGetAuthenticatedUserId: jest.fn(),
  getAuthenticatedUserId: jest.fn(),
}));

import { maybeGetAuthenticatedUserId, getAuthenticatedUserId } from "@/lib/utils/api-helpers";

const mockGetUserTier = getUserTier as jest.Mock;
const mockGetResume = getResume as jest.Mock;
const mockUpdateResume = updateResume as jest.Mock;
const mockDeleteResume = deleteResume as jest.Mock;

const buildRequest = (body: Record<string, unknown>, headers?: HeadersInit) =>
  new NextRequest("http://localhost/api/resumes/42", {
    method: "PUT",
    body: JSON.stringify(body),
    headers,
  });

describe("PUT /api/resumes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when authorization header is missing", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) });

    const request = buildRequest({ resume: { title: "Updated" } });
    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 when user does not own the resume", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "another-user" });
    mockGetResume.mockResolvedValue({ access: "none", resume: null });

    const request = buildRequest(
      { resume: { title: "Updated" } },
      { authorization: "Bearer token" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 403 when basic user tries to edit", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "user-123" });
    mockGetResume.mockResolvedValue({ access: "owner", resume: { userId: "user-123" } });
    mockGetUserTier.mockResolvedValue("basic");

    const request = buildRequest(
      { resume: { title: "Updated" } },
      { authorization: "Bearer token" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Editing is not allowed");
  });

  it("updates resume content and returns updated payload", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "user-123" });
    mockGetResume.mockResolvedValue({ access: "owner", resume: { userId: "user-123", title: "Original" } });
    mockGetUserTier.mockResolvedValue("premium");
    mockUpdateResume.mockResolvedValue(undefined);

    const request = buildRequest(
      {
        resume: {
          title: "Updated Title",
          summary: "New summary",
        },
      },
      { authorization: "Bearer token" }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.resume.title).toBe("Updated Title");

    expect(mockUpdateResume).toHaveBeenCalledWith("42", "user-123", expect.objectContaining({
      title: "Updated Title",
    }));
  });
});

describe("GET /api/resumes/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns cache headers for public resumes", async () => {
    mockGetResume.mockResolvedValue({
      access: "public_snapshot",
      resume: { title: "Public Resume" }
    });

    const request = new NextRequest("http://localhost/api/resumes/42", {
      method: "GET",
    });

    const response = await GET(request, {
      params: Promise.resolve({ id: "42" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  });
});

// Mock NextResponse to ensure headers are passed correctly in test environment
jest.mock("next/server", () => {
  const actual = jest.requireActual("next/server");
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: (body: any, init: any) => {
        return Response.json(body, init);
      },
    },
  };
});
