import { GET, POST, DELETE } from "./route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";
import { decrementJobSeekerMetric, updateRecruiterAccessMetric } from "@/lib/services/metricsService";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
    adminDb: {
        collection: jest.fn(),
        collectionGroup: jest.fn(),
    },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
    getAuthenticatedUserId: jest.fn(),
    handleApiError: jest.fn((error, message, status) => {
        return Response.json({ error: message, details: error?.message }, { status: status || 500 });
    }),
}));

jest.mock("@/lib/services/metricsService", () => ({
    decrementJobSeekerMetric: jest.fn(),
    updateRecruiterAccessMetric: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("/api/recruiter/requests", () => {
    const recruiterId = "rec-123";

    beforeEach(() => {
        jest.clearAllMocks();
        (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: recruiterId });

        // Default user role as recruiter
        (adminDb.collection as jest.Mock).mockImplementation((name) => {
            if (name === "users") {
                return { doc: () => ({ get: () => Promise.resolve({ data: () => ({ role: "recruiter" }) }) }) };
            }
            return { doc: jest.fn() };
        });
    });

    const buildRequest = (url: string, method: string) => new NextRequest(url, { method });

    describe("GET", () => {
        it("returns 403 if not a recruiter", async () => {
            (adminDb.collection as jest.Mock).mockImplementation(() => ({
                doc: () => ({ get: () => Promise.resolve({ data: () => ({ role: "seeker" }) }) })
            }));
            const response = await GET(buildRequest("http://localhost/api", "GET"));
            expect(response.status).toBe(403);
        });

        it("fetches recruiter requests and resolves candidate names", async () => {
            const mockRequests = [
                {
                    id: "req-1",
                    ref: { parent: { parent: { id: "res-1" } } },
                    data: () => ({ fromUserId: recruiterId, status: "pending", timestamp: { toDate: () => new Date() } }),
                }
            ];

            (adminDb.collectionGroup as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ docs: mockRequests }),
            });

            // Mock resumes and users collection for candidate name resolution
            (adminDb.collection as jest.Mock).mockImplementation((name) => ({
                doc: (id: string) => ({
                    get: () => {
                        if (name === "resumes") return Promise.resolve({ exists: true, data: () => ({ title: "Senior Dev", userId: "user-1" }) });
                        if (name === "users" && id === recruiterId) return Promise.resolve({ data: () => ({ role: "recruiter" }) });
                        if (name === "users" && id === "user-1") return Promise.resolve({ data: () => ({ displayName: "John Doe" }) });
                        return Promise.resolve({ exists: false });
                    }
                })
            }));

            const response = await GET(buildRequest("http://localhost/api", "GET"));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.requests[0].candidateName).toBe("John Doe");
            expect(data.requests[0].resumeTitle).toBe("Senior Dev");
        });
    });

    describe("POST", () => {
        it("returns 405 Method Not Allowed", async () => {
            const response = await POST(buildRequest("http://localhost/api", "POST"));
            expect(response.status).toBe(405);
        });
    });

    describe("DELETE", () => {
        it("returns 400 if params are missing", async () => {
            const response = await DELETE(buildRequest("http://localhost/api", "DELETE"));
            expect(response.status).toBe(400);
        });

        it("deletes request and updates metrics", async () => {
            const requestId = "req-1";
            const resumeId = "res-1";
            const requestRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ fromUserId: recruiterId, status: "pending" })
                }),
                delete: jest.fn().mockResolvedValue(undefined),
            };

            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                if (name === "resumes") return {
                    doc: (id: string) => {
                        if (id === resumeId) return {
                            get: () => Promise.resolve({ data: () => ({ userId: "owner-1" }) }),
                            collection: () => ({ doc: () => requestRef })
                        };
                        return {};
                    }
                };
                if (name === "users") return { doc: () => ({ get: () => Promise.resolve({ data: () => ({ role: "recruiter" }) }) }) };
                return {};
            });

            const response = await DELETE(buildRequest(`http://localhost/api?requestId=${requestId}&resumeId=${resumeId}`, "DELETE"));
            expect(response.status).toBe(200);
            expect(requestRef.delete).toHaveBeenCalled();
            expect(decrementJobSeekerMetric).toHaveBeenCalledWith("owner-1", "contactRequests");
            expect(updateRecruiterAccessMetric).toHaveBeenCalledWith(recruiterId, "pending", -1);
        });

        it("returns 403 if not the request sender", async () => {
            const requestRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ fromUserId: "different-recruiter" })
                }),
            };
            (adminDb.collection as jest.Mock).mockImplementation((name) => {
                if (name === "resumes") return {
                    doc: () => ({ collection: () => ({ doc: () => requestRef }) })
                };
                if (name === "users") return { doc: () => ({ get: () => Promise.resolve({ data: () => ({ role: "recruiter" }) }) }) };
                return {};
            });

            const response = await DELETE(buildRequest("http://localhost/api?requestId=1&resumeId=2", "DELETE"));
            expect(response.status).toBe(403);
        });
    });
});
