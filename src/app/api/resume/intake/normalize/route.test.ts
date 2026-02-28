import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";

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

jest.mock("@/lib/services/resumeIntakeNormalizer", () => ({
  ResumeIntakeNormalizer: {
    normalize: jest.fn(),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("POST /api/resume/intake/normalize", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns auth error when unauthenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new NextRequest("http://localhost/api/resume/intake/normalize", {
      method: "POST",
      body: JSON.stringify({ sources: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("normalizes intake when request is valid", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "user-123" });
    (ResumeIntakeNormalizer.normalize as jest.Mock).mockReturnValue({
      draft: {
        mergedText: "text",
        cleanedText: "text",
        sections: {
          contact: [],
          summary: [],
          experience: [],
          education: [],
          skills: [],
          projects: [],
          other: [],
        },
        extractedData: {},
        extractedFields: [],
      },
      evidenceMap: {},
      missingCriticalFields: ["name"],
    });

    const req = new NextRequest("http://localhost/api/resume/intake/normalize", {
      method: "POST",
      body: JSON.stringify({
        sources: [{ channel: "chat", text: "hello" }],
      }),
      headers: { authorization: "Bearer token" },
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.missingCriticalFields).toEqual(["name"]);
    expect(ResumeIntakeNormalizer.normalize).toHaveBeenCalledTimes(1);
  });
});
