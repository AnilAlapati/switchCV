import { GET } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
    adminAuth: {
        verifyIdToken: jest.fn().mockResolvedValue({
            uid: "test-user-id",
            email: "test@example.com",
        }),
    },
}));

jest.mock("@/lib/services/resumeGenerationQueue", () => ({
    getJobStatus: jest.fn(),
}));

import { getJobStatus } from "@/lib/services/resumeGenerationQueue";

describe("GET /api/resume/generate/status/[jobId]", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 401 without authentication", async () => {
        const mockAuth = require("@/lib/firebase-admin").adminAuth;
        mockAuth.verifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));

        const req = new NextRequest(
            "http://localhost/api/resume/generate/status/job-123",
            {
                method: "GET",
                headers: { authorization: "Bearer invalid-token" },
            }
        );

        const params = Promise.resolve({ jobId: "job-123" });
        const res = await GET(req, { params });

        expect(res.status).toBe(401);
    });

    it("should return 404 for non-existent job", async () => {
        (getJobStatus as jest.Mock).mockResolvedValue(null);

        const req = new NextRequest(
            "http://localhost/api/resume/generate/status/job-123",
            {
                method: "GET",
                headers: { authorization: "Bearer valid-token" },
            }
        );

        const params = Promise.resolve({ jobId: "job-123" });
        const res = await GET(req, { params });

        expect(res.status).toBe(404);
    });

    it("should return job status for pending job", async () => {
        (getJobStatus as jest.Mock).mockResolvedValue({
            id: "job-123",
            userId: "test-user-id",
            status: "pending",
            progress: 0,
            payload: {},
        });

        const req = new NextRequest(
            "http://localhost/api/resume/generate/status/job-123",
            {
                method: "GET",
                headers: { authorization: "Bearer valid-token" },
            }
        );

        const params = Promise.resolve({ jobId: "job-123" });
        const res = await GET(req, { params });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.status).toBe("pending");
        expect(data.progress).toBe(0);
    });

    it("should return result for completed job", async () => {
        (getJobStatus as jest.Mock).mockResolvedValue({
            id: "job-123",
            userId: "test-user-id",
            status: "completed",
            progress: 100,
            result: {
                response: "Resume created successfully",
                model: "gemini-2.5-flash",
                resumeId: "resume-456",
                created: true,
                progress: 100,
            },
        });

        const req = new NextRequest(
            "http://localhost/api/resume/generate/status/job-123",
            {
                method: "GET",
                headers: { authorization: "Bearer valid-token" },
            }
        );

        const params = Promise.resolve({ jobId: "job-123" });
        const res = await GET(req, { params });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.status).toBe("completed");
        expect(data.result.resumeId).toBe("resume-456");
        expect(data.result.created).toBe(true);
    });

    it("should return error for failed job", async () => {
        (getJobStatus as jest.Mock).mockResolvedValue({
            id: "job-123",
            userId: "test-user-id",
            status: "failed",
            progress: 50,
            error: "AI provider timeout",
        });

        const req = new NextRequest(
            "http://localhost/api/resume/generate/status/job-123",
            {
                method: "GET",
                headers: { authorization: "Bearer valid-token" },
            }
        );

        const params = Promise.resolve({ jobId: "job-123" });
        const res = await GET(req, { params });
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.status).toBe("failed");
        expect(data.error).toBe("AI provider timeout");
    });
});
