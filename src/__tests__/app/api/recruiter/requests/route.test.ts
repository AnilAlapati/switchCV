import { GET, POST, DELETE } from "@/app/api/recruiter/requests/route";
import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
    getAuthenticatedUserId,
    handleApiError,
} from "@/lib/utils/api-helpers";
import {
    decrementJobSeekerMetric,
    updateRecruiterAccessMetric,
} from "@/lib/services/metricsService";

// Mock dependencies
jest.mock("@/lib/firebase-admin", () => ({
    adminDb: {
        collection: jest.fn(),
        collectionGroup: jest.fn(),
    },
}));

jest.mock("@/lib/utils/api-helpers", () => ({
    getAuthenticatedUserId: jest.fn(),
    handleApiError: jest.fn(),
}));

jest.mock("@/lib/services/metricsService", () => ({
    decrementJobSeekerMetric: jest.fn(),
    updateRecruiterAccessMetric: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("/api/recruiter/requests", () => {
    const mockUserId = "recruiter-123";

    beforeEach(() => {
        jest.clearAllMocks();

        (handleApiError as jest.Mock).mockImplementation((error, message, status = 500) => {
            return new Response(JSON.stringify({ error: message }), { status });
        });
    });

    describe("GET", () => {
        it("should return 401 if unauthorized", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: null });
            const req = new NextRequest("http://localhost/api/recruiter/requests");
            const res = await GET(req);
            expect(res.status).toBe(401);
        });

        it("should return 403 if user is not a recruiter", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            (adminDb.collection as jest.Mock).mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        data: () => ({ role: "candidate" }),
                    }),
                }),
            });

            const req = new NextRequest("http://localhost/api/recruiter/requests");
            const res = await GET(req);
            expect(res.status).toBe(403);
        });

        it("should fetch requests successfully", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });

            // Mock recruiter role
            (adminDb.collection as jest.Mock).mockImplementation((col) => {
                if (col === "users") {
                    return {
                        doc: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                data: () => ({ role: "recruiter" }),
                            }),
                        }),
                    };
                }
                if (col === "resumes") {
                    return {
                        doc: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                data: () => ({ title: "Test Resume", userId: "jobseeker-456" }),
                            }),
                        }),
                    };
                }
                return {};
            });

            // Mock collectionGroup
            const mockDocs = [
                {
                    id: "req-1",
                    data: () => ({
                        fromUserId: mockUserId,
                        status: "pending",
                        timestamp: { toDate: () => new Date() }
                    }),
                    ref: { parent: { parent: { id: "resume-1" } } },
                },
            ];

            (adminDb.collectionGroup as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ docs: mockDocs }),
            });

            const req = new NextRequest("http://localhost/api/recruiter/requests");
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.requests).toHaveLength(1);
            expect(json.requests[0].resumeTitle).toBe("Test Resume");
        });

        it("should handle mixed timestamp types and expiry logic", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            (adminDb.collection as jest.Mock).mockReturnValue({
                doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ role: "recruiter" }) }) }),
            });

            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 1);

            const mockDocs = [
                {
                    id: "req-expire",
                    data: () => ({
                        timestamp: futureDate.toISOString(),
                        expiresAt: futureDate.toISOString(),
                        approvedAt: new Date().toISOString(),
                    }),
                    ref: { parent: { parent: { id: "resume-1" } } },
                },
            ];

            (adminDb.collectionGroup as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ docs: mockDocs }),
            });

            const req = new NextRequest("http://localhost/api/recruiter/requests");
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.requests[0].isExpired).toBe(false);
        });

        it("should handle invalid timestamps and serialization errors", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            (adminDb.collection as jest.Mock).mockReturnValue({
                doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({ role: "recruiter" }) }) }),
            });

            const mockDocs = [
                {
                    id: "req-invalid",
                    data: () => ({
                        timestamp: "not-a-date",
                        expiresAt: "invalid-date",
                        // Trigger error in serializeTimestamp
                        approvedAt: { toDate: () => { throw new Error("Boom"); } },
                    }),
                    ref: { parent: { parent: { id: "resume-1" } } },
                },
            ];

            (adminDb.collectionGroup as jest.Mock).mockReturnValue({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ docs: mockDocs }),
            });

            const req = new NextRequest("http://localhost/api/recruiter/requests");
            const res = await GET(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.requests[0].approvedAt).toBeNull();
            expect(json.requests[0].expiresAt).toBeNull();
        });

        it("should handle errors in GET", async () => {
            (getAuthenticatedUserId as jest.Mock).mockRejectedValue(new Error("Global GET error"));
            const req = new NextRequest("http://localhost/api/recruiter/requests");
            const res = await GET(req);
            expect(res.status).toBe(500);
        });
    });

    describe("POST", () => {
        it("should return 405 Method Not Allowed", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            (adminDb.collection as jest.Mock).mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        data: () => ({ role: "recruiter" }),
                    }),
                }),
            });

            const req = new NextRequest("http://localhost/api/recruiter/requests", { method: "POST" });
            const res = await POST(req);
            expect(res.status).toBe(405);
        });

        it("should return 403 if not recruiter in POST", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            (adminDb.collection as jest.Mock).mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ data: () => ({ role: "candidate" }) }),
                }),
            });
            const req = new NextRequest("http://localhost/api/recruiter/requests", { method: "POST" });
            const res = await POST(req);
            expect(res.status).toBe(403);
        });

        it("should handle errors in POST", async () => {
            (getAuthenticatedUserId as jest.Mock).mockRejectedValue(new Error("POST error"));
            const req = new NextRequest("http://localhost/api/recruiter/requests", { method: "POST" });
            const res = await POST(req);
            expect(res.status).toBe(500);
        });
    });

    describe("DELETE", () => {
        it("should return 400 if params are missing", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            const req = new NextRequest("http://localhost/api/recruiter/requests");
            const res = await DELETE(req);
            expect(res.status).toBe(400);
        });

        it("should delete request successfully", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });

            const mockRequestRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ fromUserId: mockUserId, status: "pending" }),
                }),
                delete: jest.fn().mockResolvedValue(undefined),
            };

            (adminDb.collection as jest.Mock).mockImplementation((col) => {
                if (col === "resumes") {
                    return {
                        doc: jest.fn().mockReturnValue({
                            get: jest.fn().mockResolvedValue({
                                data: () => ({ userId: "jobseeker-456" }),
                            }),
                            collection: jest.fn().mockReturnValue({
                                doc: jest.fn().mockReturnValue(mockRequestRef),
                            }),
                        }),
                    };
                }
                return {};
            });

            const req = new NextRequest("http://localhost/api/recruiter/requests?requestId=req1&resumeId=res1");
            const res = await DELETE(req);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.success).toBe(true);
            expect(mockRequestRef.delete).toHaveBeenCalled();
            expect(decrementJobSeekerMetric).toHaveBeenCalled();
            expect(updateRecruiterAccessMetric).toHaveBeenCalled();
        });

        it("should return 404 if request not found", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });

            const mockRequestRef = {
                get: jest.fn().mockResolvedValue({ exists: false }),
            };

            (adminDb.collection as jest.Mock).mockImplementation(() => ({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue(mockRequestRef),
                    }),
                }),
            }));

            const req = new NextRequest("http://localhost/api/recruiter/requests?requestId=req1&resumeId=res1");
            const res = await DELETE(req);
            expect(res.status).toBe(404);
        });

        it("should return 403 if not owner of the request", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            const mockRequestRef = {
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({ fromUserId: "other-user" }),
                }),
            };
            (adminDb.collection as jest.Mock).mockImplementation(() => ({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        doc: jest.fn().mockReturnValue(mockRequestRef),
                    }),
                }),
            }));

            const req = new NextRequest("http://localhost/api/recruiter/requests?requestId=req1&resumeId=res1");
            const res = await DELETE(req);
            expect(res.status).toBe(403);
        });

        it("should handle errors in DELETE", async () => {
            (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: mockUserId });
            (adminDb.collection as jest.Mock).mockImplementation(() => { throw new Error("Delete fail"); });
            const req = new NextRequest("http://localhost/api/recruiter/requests?requestId=req1&resumeId=res1");
            const res = await DELETE(req);
            expect(res.status).toBe(500);
        });
    });
});
