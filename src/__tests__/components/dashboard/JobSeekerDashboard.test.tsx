import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JobSeekerDashboard } from "@/components/dashboard/JobSeekerDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toast } from "sonner";

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("@/hooks/useUserProfile", () => ({
    useUserProfile: jest.fn(),
}));

// Mock sub-components to focus on dashboard logic
jest.mock("@/components/dashboard/ResumeSnapshotCard", () => ({
    ResumeSnapshotCard: ({ onToggleVisibility }: any) => (
        <div data-testid="snapshot-card">
            <button onClick={onToggleVisibility}>Toggle</button>
        </div>
    ),
}));
jest.mock("@/components/dashboard/AgentStatus", () => ({ AgentStatus: () => <div /> }));
jest.mock("@/components/dashboard/MarketPulseCard", () => ({ MarketPulseCard: () => <div /> }));
jest.mock("@/components/dashboard/ActivityTimeline", () => ({ ActivityTimeline: () => <div /> }));
jest.mock("@/components/dashboard/PriorityActionsCard", () => ({ PriorityActionsCard: () => <div /> }));
jest.mock("@/components/dashboard/OpportunityInsightsCard", () => ({ OpportunityInsightsCard: () => <div data-testid="insights-card" /> }));
jest.mock("@/components/dashboard/ResourceLinksCard", () => ({ ResourceLinksCard: () => <div /> }));
jest.mock("@/components/dashboard/ResumeList", () => ({ ResumeList: () => <div /> }));
jest.mock("@/components/dashboard/DashboardSkeleton", () => ({ JobSeekerDashboardSkeleton: () => <div data-testid="skeleton" /> }));
jest.mock("@/components/ui/PremiumFeatureLock", () => ({ PremiumFeatureLock: ({ children }: any) => <>{children}</> }));

jest.mock("@/lib/dashboard/jobSeekerInsights", () => ({
    buildJobSeekerActionPlan: jest.fn(() => []),
    buildJobSeekerInsights: jest.fn(() => ({})),
}));

jest.mock("@/lib/logger");
jest.mock("sonner", () => ({
    toast: {
        error: jest.fn(),
    },
}));

describe("JobSeekerDashboard", () => {
    const mockOnRefresh = jest.fn();
    const mockUser = {
        uid: "user-123",
        getIdToken: jest.fn().mockResolvedValue("token"),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
        (useUserProfile as jest.Mock).mockReturnValue({ tier: "basic", profile: {} });
        global.fetch = jest.fn();
    });

    it("renders skeleton when metrics are loading", () => {
        render(
            <JobSeekerDashboard
                hasResume={false}
                resumeId={null}
                resumeLoading={false}
                metrics={null}
                metricsLoading={true}
            />
        );
        expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });

    it("renders dashboard content when loaded", () => {
        render(
            <JobSeekerDashboard
                hasResume={true}
                resumeId="res-123"
                resumeLoading={false}
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByTestId("snapshot-card")).toBeInTheDocument();
    });

    it("shows premium insights only for premium users", () => {
        const { rerender } = render(
            <JobSeekerDashboard
                hasResume={true}
                resumeId="res-123"
                resumeLoading={false}
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.queryByTestId("insights-card")).not.toBeInTheDocument();

        (useUserProfile as jest.Mock).mockReturnValue({ tier: "premium", profile: {} });
        rerender(
            <JobSeekerDashboard
                hasResume={true}
                resumeId="res-123"
                resumeLoading={false}
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByTestId("insights-card")).toBeInTheDocument();
    });

    it("handles toggling visibility successfully", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

        render(
            <JobSeekerDashboard
                hasResume={true}
                resumeId="res-123"
                resumeLoading={false}
                metrics={{} as any}
                metricsLoading={false}
                onRefreshResume={mockOnRefresh}
            />
        );

        fireEvent.click(screen.getByText("Toggle"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/api/resumes/res-123",
                expect.objectContaining({ method: "PATCH" })
            );
            expect(mockOnRefresh).toHaveBeenCalled();
        });
    });

    it("handles toggling visibility error", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

        render(
            <JobSeekerDashboard
                hasResume={true}
                resumeId="res-123"
                resumeLoading={false}
                metrics={{} as any}
                metricsLoading={false}
            />
        );

        fireEvent.click(screen.getByText("Toggle"));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to update visibility settings.");
        });
    });
});
