import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

// Mock dependencies
jest.mock("@/lib/utils/api-helpers", () => ({
    getAuthenticatedUserId: jest.fn(),
    applyRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    handleApiError: jest.fn((_error, message, status = 500) => {
        // Use require to avoid hoisting issues
        const { NextResponse } = require("next/server");
        return NextResponse.json({ error: message }, { status });
    }),
}));

jest.mock("@/lib/services/smartSearchService", () => ({
    searchByJobDescription: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { searchByJobDescription } from "@/lib/services/smartSearchService";

const mockGetAuthenticatedUserId = getAuthenticatedUserId as jest.MockedFunction<
    typeof getAuthenticatedUserId
>;
const mockSearchByJobDescription = searchByJobDescription as jest.MockedFunction<
    typeof searchByJobDescription
>;

describe("POST /api/recruiter/jd-search", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function createMockRequest(body: unknown): NextRequest {
        return {
            json: jest.fn().mockResolvedValue(body),
        } as unknown as NextRequest;
    }

    it("returns 401 if user is not authenticated", async () => {
        mockGetAuthenticatedUserId.mockResolvedValue({
            userId: undefined,
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        });

        const request = createMockRequest({ jdText: "Test JD content..." });
        const response = await POST(request);

        expect(response.status).toBe(401);
    });

    it("returns 400 if JD text is too short", async () => {
        mockGetAuthenticatedUserId.mockResolvedValue({
            userId: "test-user-id",
            error: undefined,
        });

        const request = createMockRequest({ jdText: "Too short" });
        const response = await POST(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe("Invalid input");
    });

    it("returns 400 if request body is invalid JSON", async () => {
        mockGetAuthenticatedUserId.mockResolvedValue({
            userId: "test-user-id",
            error: undefined,
        });

        const request = {
            json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
        } as unknown as NextRequest;

        const response = await POST(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toContain("Invalid JSON");
    });

    it("returns search results for valid JD text", async () => {
        mockGetAuthenticatedUserId.mockResolvedValue({
            userId: "test-recruiter-id",
            error: undefined,
        });

        const mockResult = {
            results: [
                {
                    resumeId: "resume-1",
                    userId: "user-1",
                    title: "Senior Engineer",
                    userName: "John Doe",
                    matchScore: 85,
                    matchedSkills: ["python", "aws"],
                    matchReason: "5/6 required skills",
                    skills: ["python", "aws", "docker"],
                    createdAt: "2026-01-01",
                },
            ],
            parsedJD: {
                title: "Senior Software Engineer",
                requiredSkills: ["python", "java"],
                preferredSkills: ["docker"],
                minExperience: 5,
                location: "San Francisco",
                workMode: "hybrid",
            },
            generatedQuery: "Senior Software Engineer python java",
            searchType: "hybrid" as const,
            fromCache: false,
            searchTimeMs: 500,
            totalScanned: 100,
            parsedQuery: {
                rawQuery: "",
                skills: [],
                location: null,
                minExperience: null,
                maxExperience: null,
                semanticQuery: "",
                queryType: "hybrid" as const,
                confidence: 0.8,
            },
        };

        mockSearchByJobDescription.mockResolvedValue(mockResult);

        const jdText = `
      Senior Software Engineer
      
      Requirements:
      - 5+ years experience with Python and Java
      - Experience with AWS, Docker, Kubernetes
      
      Location: San Francisco (Hybrid)
    `;

        const request = createMockRequest({ jdText, limit: 50, useAI: true });
        const response = await POST(request);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.results).toHaveLength(1);
        expect(body.parsedJD.title).toBe("Senior Software Engineer");
        expect(body.searchType).toBe("hybrid");
    });

    it("uses default values for optional parameters", async () => {
        mockGetAuthenticatedUserId.mockResolvedValue({
            userId: "test-recruiter-id",
            error: undefined,
        });

        mockSearchByJobDescription.mockResolvedValue({
            results: [],
            parsedJD: {
                title: "Test",
                requiredSkills: [],
                preferredSkills: [],
                minExperience: null,
                location: null,
                workMode: null,
            },
            generatedQuery: "Test",
            searchType: "semantic" as const,
            fromCache: false,
            searchTimeMs: 100,
            totalScanned: 0,
            parsedQuery: {
                rawQuery: "",
                skills: [],
                location: null,
                minExperience: null,
                maxExperience: null,
                semanticQuery: "",
                queryType: "semantic" as const,
                confidence: 0.5,
            },
        });

        const jdText = "A".repeat(60); // Minimum valid length
        const request = createMockRequest({ jdText }); // No limit or useAI provided

        await POST(request);

        expect(mockSearchByJobDescription).toHaveBeenCalledWith({
            jdText,
            recruiterId: "test-recruiter-id",
            limit: 50, // Default
            useAI: true, // Default
        });
    });
});
