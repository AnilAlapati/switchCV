import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { processSyncGeneration } from "@/lib/services/resumeGenerationOrchestrator";

jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((error, message, status = 500) => {
    const { NextResponse: mockNextResponse } = require("next/server");
    return mockNextResponse.json(
      { error: message, details: error ? String(error) : undefined },
      { status },
    );
  }),
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/services/resumeGenerationOrchestrator", () => ({
  processSyncGeneration: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("POST /api/resume/generate/preview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns auth error when unauthenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/resume/generate/preview", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("generates preview without persistence", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "user-123" });
    (getUserTier as jest.Mock).mockResolvedValue("premium");
    (processSyncGeneration as jest.Mock).mockResolvedValue({
      response: "Preview generated successfully",
      created: false,
      progress: 100,
    });

    const req = new NextRequest("http://localhost/api/resume/generate/preview", {
      method: "POST",
      body: JSON.stringify({
        message: "Create a software engineer resume preview",
        conversationHistory: [],
      }),
      headers: { authorization: "Bearer token" },
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.created).toBe(false);
    expect(processSyncGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        persistResult: false,
      }),
    );
  });
});
