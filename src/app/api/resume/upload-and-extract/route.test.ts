import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { BillingService } from "@/lib/services/billingService";
import { DocumentParser } from "@/lib/services/documentParser";
import { createAIObservationContext } from "@/lib/services/aiMonitoringService";
import { isFeatureEnabled } from "@/lib/services/featureFlagService";
import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";
import { getUserTier } from "@/lib/services/userService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { containsPromptInjection } from "@/lib/utils/promptSafety";

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

jest.mock("@/lib/services/billingService", () => ({
  BillingService: {
    checkBudget: jest.fn(),
  },
}));

jest.mock("@/lib/services/documentParser", () => ({
  DocumentParser: {
    parseFile: jest.fn(),
  },
}));

jest.mock("@/lib/services/aiMonitoringService", () => ({
  createAIObservationContext: jest.fn(),
}));

jest.mock("@/lib/services/featureFlagService", () => ({
  isFeatureEnabled: jest.fn(),
}));

jest.mock("@/lib/services/resumeIntakeNormalizer", () => ({
  ResumeIntakeNormalizer: {
    normalizeWithAI: jest.fn(),
  },
}));

jest.mock("@/lib/services/userService", () => ({
  getUserTier: jest.fn(),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
  checkDistributedRateLimit: jest.fn(),
}));

jest.mock("@/lib/utils/promptSafety", () => ({
  containsPromptInjection: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const VALID_TEXT =
  "Jane Doe\njane@example.com\nProfessional summary with enough detail for extraction.\nSkills\nReact, TypeScript, Node.js\nExperience\nEngineer at Acme";

function createRequest(file?: File): NextRequest {
  const formData = new FormData();
  if (file !== undefined) {
    formData.append("file", file);
  }

  return {
    headers: new Headers({ authorization: "Bearer token" }),
    formData: jest.fn().mockResolvedValue(formData),
  } as unknown as NextRequest;
}

function createFile(
  name: string = "resume.pdf",
  type: string = "application/pdf",
  content: BlobPart = VALID_TEXT,
): File {
  const file = new File([content], name, { type });
  const buffer =
    typeof content === "string"
      ? new TextEncoder().encode(content).buffer
      : content instanceof Uint8Array
        ? content.buffer.slice(
            content.byteOffset,
            content.byteOffset + content.byteLength,
          )
        : new TextEncoder().encode(String(content)).buffer;

  Object.defineProperty(file, "arrayBuffer", {
    value: jest.fn().mockResolvedValue(buffer),
  });

  return file;
}

describe("POST /api/resume/upload-and-extract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: "user-123",
      error: undefined,
    });
    (getUserTier as jest.Mock).mockResolvedValue("premium");
    (isFeatureEnabled as jest.Mock).mockResolvedValue(true);
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 50,
      resetIn: 3600000,
      remaining: 49,
    });
    (BillingService.checkBudget as jest.Mock).mockResolvedValue(true);
    (DocumentParser.parseFile as jest.Mock).mockResolvedValue(VALID_TEXT);
    (containsPromptInjection as jest.Mock).mockReturnValue(false);
    (createAIObservationContext as jest.Mock).mockReturnValue({
      requestId: "request-123",
    });
    (ResumeIntakeNormalizer.normalizeWithAI as jest.Mock).mockResolvedValue({
      draft: {
        extractedData: {
          name: "Jane Doe",
          email: "jane@example.com",
          skills: ["React", "TypeScript"],
        },
        extractedFields: ["name", "email", "skills"],
      },
      missingCriticalFields: [],
      extractionMethod: "ai",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
      userId: undefined,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(createRequest(createFile()));

    expect(response.status).toBe(401);
    expect(getUserTier).not.toHaveBeenCalled();
  });

  it("returns 403 when feature flag is disabled", async () => {
    (isFeatureEnabled as jest.Mock).mockResolvedValue(false);

    const response = await POST(createRequest(createFile()));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("File upload is not available on your plan");
    expect(DocumentParser.parseFile).not.toHaveBeenCalled();
  });

  it("returns 429 when distributed rate limit blocks", async () => {
    (checkDistributedRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      current: 50,
      limit: 50,
      resetIn: 1000,
      remaining: 0,
    });

    const response = await POST(createRequest(createFile()));

    expect(response.status).toBe(429);
    expect(DocumentParser.parseFile).not.toHaveBeenCalled();
  });

  it("returns 402 when budget check blocks", async () => {
    (BillingService.checkBudget as jest.Mock).mockResolvedValue(false);

    const response = await POST(createRequest(createFile()));

    expect(response.status).toBe(402);
    expect(DocumentParser.parseFile).not.toHaveBeenCalled();
  });

  it("returns 400 when no file is uploaded", async () => {
    const response = await POST(createRequest());

    expect(response.status).toBe(400);
  });

  it("returns 400 when file is over 5 MB", async () => {
    const largeFile = createFile(
      "resume.pdf",
      "application/pdf",
      new Uint8Array(5 * 1024 * 1024 + 1),
    );

    const response = await POST(createRequest(largeFile));

    expect(response.status).toBe(400);
    expect(DocumentParser.parseFile).not.toHaveBeenCalled();
  });

  it("returns 400 when extension is unsupported", async () => {
    const response = await POST(
      createRequest(createFile("resume.rtf", "application/rtf")),
    );

    expect(response.status).toBe(400);
    expect(DocumentParser.parseFile).not.toHaveBeenCalled();
  });

  it("returns 400 when MIME does not match extension", async () => {
    const response = await POST(
      createRequest(createFile("resume.pdf", "text/plain")),
    );

    expect(response.status).toBe(400);
    expect(DocumentParser.parseFile).not.toHaveBeenCalled();
  });

  it("returns 422 SCANNED_PDF when extracted text is too short", async () => {
    (DocumentParser.parseFile as jest.Mock).mockResolvedValue("Too short");

    const response = await POST(createRequest(createFile()));
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.code).toBe("SCANNED_PDF");
    expect(ResumeIntakeNormalizer.normalizeWithAI).not.toHaveBeenCalled();
  });

  it("returns 400 when prompt injection is detected", async () => {
    (containsPromptInjection as jest.Mock).mockReturnValue(true);

    const response = await POST(createRequest(createFile()));

    expect(response.status).toBe(400);
    expect(ResumeIntakeNormalizer.normalizeWithAI).not.toHaveBeenCalled();
  });

  it("returns uploadDraft on success", async () => {
    const response = await POST(createRequest(createFile()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.uploadDraft).toEqual(
      expect.objectContaining({
        sourceChannel: "pdf",
        fileName: "resume.pdf",
        extractedFields: ["name", "email", "skills"],
        missingFields: [],
        extractionMethod: "ai",
      }),
    );
    expect(payload.uploadDraft.extractedData).toEqual(
      expect.objectContaining({ name: "Jane Doe" }),
    );
    expect(payload.uploadDraft.mergedText).toBeUndefined();
    expect(ResumeIntakeNormalizer.normalizeWithAI).toHaveBeenCalledWith(
      { sources: [{ channel: "pdf", text: VALID_TEXT }] },
      expect.objectContaining({
        userTier: "premium",
        observationContext: { requestId: "request-123" },
      }),
    );
  });

  it("returns generic 500 through handleApiError when parser throws", async () => {
    const parseError = new Error("PDF parser failed");
    (DocumentParser.parseFile as jest.Mock).mockRejectedValue(parseError);

    const response = await POST(createRequest(createFile()));

    expect(response.status).toBe(500);
    expect(handleApiError).toHaveBeenCalledWith(
      parseError,
      "Failed to process uploaded file",
      500,
      expect.anything(),
    );
  });

  it("returns generic 500 through handleApiError when normalizer throws", async () => {
    const normalizeError = new Error("AI failed");
    (ResumeIntakeNormalizer.normalizeWithAI as jest.Mock).mockRejectedValue(
      normalizeError,
    );

    const response = await POST(createRequest(createFile()));

    expect(response.status).toBe(500);
    expect(handleApiError).toHaveBeenCalledWith(
      normalizeError,
      "Failed to process uploaded file",
      500,
      expect.anything(),
    );
  });
});
