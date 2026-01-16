import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/services/adminService", () => ({
    verifyAdminAccess: jest.fn(),
    getSystemStats: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
    getAuthenticatedUserId: jest.fn(),
    handleApiError: jest.fn((error, message, status) => {
        return Response.json({ error: message, details: error?.message }, { status: status || 500 });
    }),
}));

import { GET } from "./route";
import { getSystemStats, verifyAdminAccess } from "@/lib/services/adminService";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

describe("GET /api/admin/stats", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 401 if user is not authenticated", async () => {
        (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: null, error: Response.json({ error: "Unauthorized" }, { status: 401 }) });

        const req = new NextRequest("http://localhost/api/admin/stats");
        const res = await GET(req);

        expect(res.status).toBe(401);
    });

    it("should return 403 if user is not an admin", async () => {
        (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "user-123" });
        (verifyAdminAccess as jest.Mock).mockResolvedValue(false);

        const req = new NextRequest("http://localhost/api/admin/stats");
        const res = await GET(req);

        expect(res.status).toBe(403);
    });

    it("should return stats if user is an admin", async () => {
        const mockStats = {
            totalResumes: 100,
            totalUsers: 50,
            billing: { totalRevenue: 500 }
        };
        (getAuthenticatedUserId as jest.Mock).mockResolvedValue({ userId: "admin-123" });
        (verifyAdminAccess as jest.Mock).mockResolvedValue(true);
        (getSystemStats as jest.Mock).mockResolvedValue(mockStats);

        const req = new NextRequest("http://localhost/api/admin/stats");
        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data).toEqual(mockStats);
    });
});
