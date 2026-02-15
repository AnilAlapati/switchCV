import {
    getAccessStatus,
    buildAccessStatusMap,
} from "./access-status";
import { collectionRef, collectionGroupRef } from "@/lib/dal";

// Mock DAL
jest.mock("@/lib/dal", () => ({
    COLLECTIONS: { RESUMES: "resumes" },
    collectionRef: jest.fn(),
    collectionGroupRef: jest.fn(),
}));

// Mock Logger
jest.mock("@/lib/logger", () => ({
    logger: {
        error: jest.fn(),
    },
}));

describe("access-status", () => {
    const mockCollectionRef = collectionRef as jest.Mock;
    const mockCollectionGroupRef = collectionGroupRef as jest.Mock;

    const mockDoc = jest.fn();
    const mockCollection = jest.fn();
    const mockGet = jest.fn();
    const mockWhere = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Default chain for collectionRef(RESUMES).doc(id).collection(...).where(...).get()
        mockCollectionRef.mockReturnValue({
            doc: mockDoc,
            firestore: { collectionGroup: jest.fn() }, // For the check in buildAccessStatusMap
        });
        mockDoc.mockReturnValue({
            collection: mockCollection,
        });
        mockCollection.mockReturnValue({
            where: mockWhere,
            get: mockGet, // fallback if no chained where
        });
        mockWhere.mockReturnValue({
            get: mockGet,
        });

        // Default chain for collectionGroupRef(...).where(...).limit(...).get()
        const createCollectionGroupChain = () => {
            const chain: any = {
                where: (...args: any[]) => {
                    mockWhere(...args);
                    return chain;
                },
                orderBy: jest.fn().mockReturnThis(),
                startAfter: jest.fn().mockReturnThis(),
                limit: () => chain,
                get: mockGet,
            };
            return chain;
        };
        mockCollectionGroupRef.mockReturnValue(createCollectionGroupChain());
    });

    describe("getAccessStatus (via fetchAccessStatusFromDb)", () => {
        it("returns 'approved' if valid active grant exists", async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        data: () => ({
                            toUserId: "rec-1",
                            expiresAt: { toDate: () => new Date(Date.now() + 10000) }, // Future
                        }),
                    },
                ],
            });

            const status = await getAccessStatus("resume-1", "rec-1");
            expect(status).toBe("approved");
        });

        it("returns 'approved' if permanent grant exists (no expiresAt)", async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        data: () => ({ toUserId: "rec-1", expiresAt: null }),
                    },
                ],
            });

            const status = await getAccessStatus("resume-1", "rec-1");
            expect(status).toBe("approved");
        });

        it("falls back to requests if grant is expired", async () => {
            // 1. Grants query -> expired grant
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        data: () => ({
                            toUserId: "rec-1",
                            expiresAt: { toDate: () => new Date(Date.now() - 10000) }, // Past
                        }),
                    },
                ],
            });

            // 2. Requests query -> pending request
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [
                    {
                        data: () => ({ status: "pending" }),
                    },
                ],
            });

            const status = await getAccessStatus("resume-1", "rec-1");
            expect(status).toBe("pending");
        });

        it("returns 'approved' from valid approved request", async () => {
            // 1. Grants query -> empty
            mockGet.mockResolvedValueOnce({ docs: [] });

            // 2. Requests query -> approved active request
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [
                    {
                        data: () => ({
                            status: "approved",
                            expiresAt: { toDate: () => new Date(Date.now() + 10000) },
                        }),
                    },
                ],
            });

            const status = await getAccessStatus("resume-1", "rec-1");
            expect(status).toBe("approved");
        });

        it("returns 'denied' if only denied request exists", async () => {
            // 1. Grants query -> empty
            mockGet.mockResolvedValueOnce({ docs: [] });

            // 2. Requests query -> denied request
            mockGet.mockResolvedValueOnce({
                empty: false,
                docs: [
                    {
                        data: () => ({ status: "denied" }),
                    },
                ],
            });

            const status = await getAccessStatus("resume-1", "rec-1");
            expect(status).toBe("denied");
        });

        it("returns 'none' if no grants or requests", async () => {
            // 1. Grants query -> empty
            mockGet.mockResolvedValueOnce({ docs: [] });
            // 2. Requests query -> empty
            mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

            const status = await getAccessStatus("resume-1", "rec-1");
            expect(status).toBe("none");
        });

        it("returns 'none' on error", async () => {
            mockGet.mockRejectedValue(new Error("DB Error"));
            const status = await getAccessStatus("resume-1", "rec-1");
            expect(status).toBe("none");
        });
    });

    describe("buildAccessStatusMap", () => {
        it("returns empty map if recruiterId is missing", async () => {
            const map = await buildAccessStatusMap("");
            expect(map.size).toBe(0);
        });

        it("builds map from requests and grants", async () => {
            // Mock requests query
            mockGet.mockResolvedValueOnce({
                forEach: (cb: (arg: any) => void) => {
                    // 1. Pending request for resume-1
                    cb({
                        data: () => ({ status: "pending" }),
                        ref: { parent: { parent: { id: "resume-1" } } },
                    });
                    // 2. Denied request for resume-2
                    cb({
                        data: () => ({ status: "denied" }),
                        ref: { parent: { parent: { id: "resume-2" } } },
                    });
                },
            });

            // Mock grants query
            mockGet.mockResolvedValueOnce({
                forEach: (cb: (arg: any) => void) => {
                    // 3. Active grant for resume-3
                    cb({
                        data: () => ({ expiresAt: null }),
                        ref: { parent: { parent: { id: "resume-3" } } },
                    });
                },
            });

            const map = await buildAccessStatusMap("rec-1");

            expect(map.get("resume-1")).toBe("pending");
            expect(map.get("resume-2")).toBe("denied");
            expect(map.get("resume-3")).toBe("approved");
        });

        it("prioritizes approved grants over other statuses", async () => {
            // Mock requests query -> Pending for resume-1
            mockGet.mockResolvedValueOnce({
                forEach: (cb: (arg: any) => void) => {
                    cb({
                        data: () => ({ status: "pending" }),
                        ref: { parent: { parent: { id: "resume-1" } } },
                    });
                },
            });

            // Mock grants query -> Approved grant for resume-1
            mockGet.mockResolvedValueOnce({
                forEach: (cb: (arg: any) => void) => {
                    cb({
                        data: () => ({ expiresAt: null }),
                        ref: { parent: { parent: { id: "resume-1" } } },
                    });
                },
            });

            const map = await buildAccessStatusMap("rec-1");
            // Approved should overwrite pending/denied
            expect(map.get("resume-1")).toBe("approved");
        });
        it("handles expiration logic correctly", async () => {
            const now = new Date();
            const future = new Date(now.getTime() + 10000);
            const past = new Date(now.getTime() - 10000);

            // Mock requests query
            mockGet.mockResolvedValueOnce({
                forEach: (cb: (arg: any) => void) => {
                    // 1. Expired approved request (should be ignored)
                    cb({
                        data: () => ({ status: "approved", expiresAt: { toDate: () => past } }),
                        ref: { parent: { parent: { id: "resume-expired-req" } } },
                    });
                    // 2. Valid approved request
                    cb({
                        data: () => ({ status: "approved", expiresAt: { toDate: () => future } }),
                        ref: { parent: { parent: { id: "resume-valid-req" } } },
                    });
                },
            });

            // Mock grants query
            mockGet.mockResolvedValueOnce({
                forEach: (cb: (arg: any) => void) => {
                    // 3. Expired grant
                    cb({
                        data: () => ({ expiresAt: { toDate: () => past } }),
                        ref: { parent: { parent: { id: "resume-expired-grant" } } },
                    });
                    // 4. Valid grant
                    cb({
                        data: () => ({ expiresAt: { toDate: () => future } }),
                        ref: { parent: { parent: { id: "resume-valid-grant" } } },
                    });
                },
            });

            const map = await buildAccessStatusMap("rec-1");

            expect(map.has("resume-expired-req")).toBe(false);
            expect(map.get("resume-valid-req")).toBe("approved");
            expect(map.has("resume-expired-grant")).toBe(false);
            expect(map.get("resume-valid-grant")).toBe("approved");
        });

        it("returns empty map if collectionGroup is not available", async () => {
            // Mock db without collectionGroup
            mockCollectionRef.mockReturnValue({
                firestore: {}, // No collectionGroup
            });
            const map = await buildAccessStatusMap("rec-1");
            expect(map.size).toBe(0);
        });

        it("handles approved request without expiration in map", async () => {
            // Mock requests query
            mockGet.mockResolvedValueOnce({
                forEach: (cb: (arg: any) => void) => {
                    cb({
                        data: () => ({ status: "approved", expiresAt: null }),
                        ref: { parent: { parent: { id: "resume-permanent" } } },
                    });
                },
            });
            // Mock grants query
            mockGet.mockResolvedValueOnce({ forEach: jest.fn() });

            const map = await buildAccessStatusMap("rec-1");
            expect(map.get("resume-permanent")).toBe("approved");
        });

        it("handles errors gracefully", async () => {
            mockGet.mockRejectedValue(new Error("DB Bomb"));
            const map = await buildAccessStatusMap("rec-1");
            expect(map.size).toBe(0);
        });
    });

    describe("resolveStatusFromMap (via getAccessStatus)", () => {
        it("resolves from map if provided", async () => {
            const map = new Map<string, any>();
            map.set("res-1", "pending");
            const status = await getAccessStatus("res-1", "rec-1", map);
            expect(status).toBe("pending");
        });

        it("returns none if map provided but resume missing", async () => {
            const map = new Map<string, any>();
            const status = await getAccessStatus("res-1", "rec-1", map);
            expect(status).toBe("none");
        });
    });
});
