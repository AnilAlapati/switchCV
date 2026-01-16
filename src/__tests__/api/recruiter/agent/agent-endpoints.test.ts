import { POST as outreachRoute } from "@/app/api/recruiter/agent/outreach/route";
import { POST as analyzeRoute } from "@/app/api/recruiter/agent/analyze/route";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import { NextRequest } from "next/server";

// Mock the service
jest.mock("@/lib/services/recruiterAgentService", () => ({
    RecruiterAgentService: {
        generateOutreachMessage: jest.fn(),
        analyzeMatch: jest.fn(),
    },
}));

// Mock auth helper
jest.mock("@/lib/utils/api-helpers", () => ({
    getAuthenticatedUserId: jest.fn().mockResolvedValue({ userId: "test-user", error: null }),
    handleApiError: jest.requireActual("@/lib/utils/api-helpers").handleApiError,
}));

describe("Recruiter Agent Endpoints", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("Outreach API should return generated message", async () => {
        (RecruiterAgentService.generateOutreachMessage as jest.Mock).mockResolvedValue("Hello candidate!");

        const req = new NextRequest("http://localhost/api/outreach", {
            method: "POST",
            body: JSON.stringify({
                candidate: { name: "John" },
                job: { title: "Dev" },
            }),
        });

        const res = await outreachRoute(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.message).toBe("Hello candidate!");
        expect(RecruiterAgentService.generateOutreachMessage).toHaveBeenCalled();
    });

    it("Analyze API should return analysis", async () => {
        (RecruiterAgentService.analyzeMatch as jest.Mock).mockResolvedValue("- Good match");

        const req = new NextRequest("http://localhost/api/analyze", {
            method: "POST",
            body: JSON.stringify({
                candidate: { name: "John" },
                job: { title: "Dev" },
            }),
        });

        const res = await analyzeRoute(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.analysis).toBe("- Good match");
        expect(RecruiterAgentService.analyzeMatch).toHaveBeenCalled();
    });
});
