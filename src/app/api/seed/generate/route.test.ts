import { NextRequest } from "next/server";

describe("POST /api/seed/generate", () => {
  let POST: any;
  let mockGenerateText: any;
  let mockHandleError: any;

  const createRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/seed/generate", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  // Helper to setup test with specific config
  const setupTest = async (enableSeeding: boolean) => {
    jest.resetModules();

    mockGenerateText = jest.fn();
    mockHandleError = jest.fn((error, message, status) => {
      return {
        status: status || 500,
        json: async () => ({ error: message, details: error }),
      };
    });

    // Re-mock dependencies for each test run
    jest.doMock("@/lib/services/aiGenerationService", () => ({
      generateText: mockGenerateText,
    }));

    jest.doMock("@/lib/utils/api-helpers", () => ({
      handleApiError: mockHandleError,
    }));

    jest.doMock("@/lib/config", () => ({
      ENABLE_SEEDING_AND_DEBUG_LISTS: enableSeeding,
    }));

    const routeModule = await import("./route");
    POST = routeModule.POST;
  };

  describe("when seeding is enabled", () => {
    beforeEach(async () => {
      await setupTest(true);
    });

    it("should return 400 if profession is missing", async () => {
      const req = createRequest({});
      await POST(req);

      expect(mockHandleError).toHaveBeenCalledWith(
        null,
        "Profession is required",
        400
      );
    });

    it("should generate resume successfully", async () => {
      const mockResume = {
        title: "Software Engineer",
        templateId: "standard-v1",
        summary: "Summary",
        skills: [],
        experience: [],
        education: [],
        contact: {},
        projects: [],
      };

      mockGenerateText.mockResolvedValue({
        text: JSON.stringify(mockResume),
      });

      const req = createRequest({ profession: "Software Engineer" });
      const response = await POST(req);
      const data = await response.json();

      expect(data).toEqual(mockResume);
      expect(mockGenerateText).toHaveBeenCalled();
    });

    it("should handle AI service errors", async () => {
      const error = new Error("AI Error");
      mockGenerateText.mockRejectedValue(error);

      const req = createRequest({ profession: "Software Engineer" });
      await POST(req);

      expect(mockHandleError).toHaveBeenCalledWith(
        error,
        "Failed to generate resume",
        500
      );
    });

    it("should handle invalid JSON from AI", async () => {
      mockGenerateText.mockResolvedValue({
        text: "Invalid JSON",
      });

      const req = createRequest({ profession: "Software Engineer" });
      await POST(req);

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        "Failed to generate resume",
        500
      );
    });
  });

  describe("when seeding is disabled", () => {
    beforeEach(async () => {
      await setupTest(false);
    });

    it("should return 403", async () => {
      const req = createRequest({ profession: "Software Engineer" });
      await POST(req);

      expect(mockHandleError).toHaveBeenCalledWith(
        null,
        "Seeding functionality is currently disabled",
        403
      );
    });
  });
});
