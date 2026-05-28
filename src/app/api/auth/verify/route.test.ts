import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/services/authService", () => ({
    verifyEmailToken: jest.fn(),
}));

jest.mock("@/lib/utils/api-helpers", () => ({
    handleApiError: jest.fn((error, message, status) => {
        return Response.json({ error: message, details: error?.message }, { status: status || 500 });
    }),
}));

jest.mock("@/lib/utils/distributedRateLimit", () => ({
    checkDistributedRateLimit: jest.fn().mockResolvedValue({
        allowed: true,
        current: 1,
        limit: 5,
        resetIn: 60000,
        remaining: 4,
    }),
}));

import { GET } from "./route";
import { verifyEmailToken } from "@/lib/services/authService";

describe("GET /api/auth/verify", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should redirect to error if token is missing", async () => {
        const req = new NextRequest("http://localhost/api/auth/verify");
        const res = await GET(req);

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("error=missing-token");
    });

    it("should redirect to success if token is valid", async () => {
        (verifyEmailToken as jest.Mock).mockResolvedValue({ success: true });

        const req = new NextRequest("http://localhost/api/auth/verify?token=valid-token");
        const res = await GET(req);

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("verificationSuccess=true");
    });

    it("should redirect to error if token is invalid", async () => {
        (verifyEmailToken as jest.Mock).mockResolvedValue({ success: false, error: "invalid-token" });

        const req = new NextRequest("http://localhost/api/auth/verify?token=invalid-token");
        const res = await GET(req);

        expect(res.status).toBe(307);
        expect(res.headers.get("location")).toContain("error=invalid-token");
    });
});
