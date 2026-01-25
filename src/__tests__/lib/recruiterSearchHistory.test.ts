import { recordRecruiterSearchEvent, getRecruiterSearchBreakdown, DEFAULT_SEARCH_BREAKDOWN } from "@/lib/recruiterSearchHistory";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";

jest.mock("@/lib/firebase-admin", () => ({
    adminDb: {
        collection: jest.fn(),
    },
}));

jest.mock("@/lib/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
    },
}));

describe("recruiterSearchHistory", () => {
    const recruiterId = "rec-123";
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockCollection = {
            add: jest.fn(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn(),
        };
        (adminDb.collection as jest.Mock).mockReturnValue(mockCollection);
    });

    describe("recordRecruiterSearchEvent", () => {
        it("should record a search event with normalised filters", async () => {
            const payload = {
                recruiterId,
                tier: "premium" as const,
                filters: {
                    skills: [" React ", null as any, "TypeScript"],
                    location: " New York ",
                },
                resultUserIds: ["user-1", "user-2", "user-1"],
            };

            await recordRecruiterSearchEvent(payload);

            expect(mockCollection.add).toHaveBeenCalledWith(expect.objectContaining({
                recruiterId,
                tier: "premium",
                filters: {
                    userId: null,
                    skills: ["react", "typescript"],
                    location: "new york",
                },
                resultCount: 2,
                resultUserIds: ["user-1", "user-2"],
                createdAt: expect.anything(),
            }));
        });

        it("should handle error during recording", async () => {
            mockCollection.add.mockRejectedValue(new Error("Firebase error"));
            await recordRecruiterSearchEvent({ recruiterId, tier: "basic" });
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("getRecruiterSearchBreakdown", () => {
        it("should return default breakdown if recruiterId is missing", async () => {
            const result = await getRecruiterSearchBreakdown("");
            expect(result).toEqual(DEFAULT_SEARCH_BREAKDOWN);
        });

        it("should return default breakdown if snapshot is empty", async () => {
            mockCollection.get.mockResolvedValue({ empty: true });
            const result = await getRecruiterSearchBreakdown(recruiterId);
            expect(result).toEqual(DEFAULT_SEARCH_BREAKDOWN);
        });

        it("should calculate breakdown correctly from history", async () => {
            const now = Date.now();
            const mockDocs = [
                {
                    data: () => ({
                        createdAt: Timestamp.fromMillis(now - 1000 * 60 * 60), // 1h ago
                        resultUserIds: ["u1"],
                        filters: { skills: ["React"], location: "SF" },
                    }),
                },
                {
                    data: () => ({
                        createdAt: Timestamp.fromMillis(now - 1000 * 60 * 60 * 25), // 25h ago
                        resultUserIds: ["u1", "u2"],
                        filters: { skills: ["React", "Node"], location: "SF" },
                    }),
                },
                {
                    data: () => ({
                        createdAt: new Date(now - 1000 * 60 * 60 * 24 * 8), // 8 days ago
                        resultUserIds: ["u3"],
                    }),
                },
                {
                    data: () => ({
                        createdAt: "invalid-date",
                    }),
                },
                {
                    data: () => ({
                        createdAt: { toDate: () => new Date(now - 500) }, // 500ms ago
                        resultUserIds: ["u4"],
                    })
                }
            ];

            mockCollection.get.mockResolvedValue({
                empty: false,
                forEach: (cb: any) => mockDocs.forEach(cb),
            });

            const result = await getRecruiterSearchBreakdown(recruiterId, { windowDays: 10 });

            expect(result.searchesLast24h).toBe(2); // 1h ago + 500ms ago
            expect(result.searchesLast7Days).toBe(3); // 1h + 25h + 500ms ago -> all within 7 days
            // Wait, let's re-calc:
            // Doc 0: 1h ago -> < 24h, < 7d. skills: react, loc: sf, results: u1
            // Doc 1: 25h ago -> > 24h, < 7d. skills: react, node, loc: sf, results: u1, u2
            // Doc 2: 8d ago -> > 24h, > 7d. Not in any count.
            // Doc 3: invalid -> ignored
            // Doc 4: 500ms ago -> < 24h, < 7d. results: u4

            // Expected:
            // Searches 24h: Doc 0, Doc 4 = 2
            // Searches 7d: Doc 0, Doc 1, Doc 4 = 3
            // Unique candidates 7d: u1 (Doc 0), u1, u2 (Doc 1), u4 (Doc 4) = u1, u2, u4 = 3
            // Top skills: react (2), node (1)
            // Top locations: sf (2)

            expect(result.searchesLast24h).toBe(2);
            expect(result.searchesLast7Days).toBe(3);
            expect(result.uniqueCandidatesLast7Days).toBe(3);
            expect(result.topSkillsLast7Days[0].name).toBe("react");
            expect(result.topLocationsLast7Days[0].name).toBe("sf");
        });

        it("should handle error during breakdown calculation", async () => {
            mockCollection.get.mockRejectedValue(new Error("Firebase query error"));
            const result = await getRecruiterSearchBreakdown(recruiterId);
            expect(result).toEqual(DEFAULT_SEARCH_BREAKDOWN);
            expect(logger.error).toHaveBeenCalled();
        });
    });
});
