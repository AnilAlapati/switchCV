import { render, screen, fireEvent } from "@testing-library/react";
import { RecruiterDashboard } from "@/components/dashboard/RecruiterDashboard";

// Mock sub-components
jest.mock("@/components/dashboard/ActionPlanCard", () => ({ ActionPlanCard: () => <div /> }));
jest.mock("@/components/dashboard/OpportunityInsightsCard", () => ({ OpportunityInsightsCard: () => <div data-testid="insights" /> }));
jest.mock("@/components/dashboard/ResourceLinksCard", () => ({ ResourceLinksCard: () => <div /> }));
jest.mock("@/components/dashboard/RecruiterSearchBox", () => ({ RecruiterSearchBox: () => <div /> }));
jest.mock("@/components/dashboard/recruiter/CandidatesSearchedCard", () => ({ CandidatesSearchedCard: () => <div /> }));
jest.mock("@/components/dashboard/recruiter/AvailableResumesCard", () => ({ AvailableResumesCard: () => <div /> }));
jest.mock("@/components/dashboard/recruiter/AccessRequestsCard", () => ({ AccessRequestsCard: () => <div /> }));
jest.mock("@/components/dashboard/recruiter/CandidatesInteractedCard", () => ({ CandidatesInteractedCard: () => <div /> }));
jest.mock("@/components/dashboard/ResumeList", () => ({ ResumeList: () => <div /> }));
jest.mock("@/components/dashboard/DashboardSkeleton", () => ({ RecruiterDashboardSkeleton: () => <div data-testid="skeleton" /> }));
jest.mock("@/components/ui/PremiumFeatureLock", () => ({ PremiumFeatureLock: ({ children }: any) => <>{children}</> }));

// Mock lib
jest.mock("@/lib/dashboard/recruiterInsights", () => ({
    buildRecruiterActionPlan: jest.fn(() => []),
    buildRecruiterInsights: jest.fn(() => ({})),
    calculatePipelineScore: jest.fn(() => 75),
    pipelineLabel: jest.fn(() => "Good"),
    formatLastActivity: jest.fn(() => "2 hours ago"),
}));

describe("RecruiterDashboard", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, NEXT_PUBLIC_FEATURE_PIPELINE_PANEL: "true" };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("renders skeleton when metrics are loading", () => {
        render(
            <RecruiterDashboard
                metrics={null}
                metricsLoading={true}
            />
        );
        expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });

    it("renders pipeline integrity panel when feature flag is on", () => {
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByText("Pipeline Integrity")).toBeInTheDocument();
        expect(screen.getByText("Start Discovery")).toBeInTheDocument();
    });

    it("hides pipeline integrity panel when feature flag is off", () => {
        process.env.NEXT_PUBLIC_FEATURE_PIPELINE_PANEL = "false";
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.queryByText("Pipeline Integrity")).not.toBeInTheDocument();
    });

    it("triggers onLaunchSearch when Discovery is clicked", () => {
        const mockLaunch = jest.fn();
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
                onLaunchSearch={mockLaunch}
            />
        );
        fireEvent.click(screen.getByText(/Start Discovery/i));
        expect(mockLaunch).toHaveBeenCalled();
    });

    it("renders all core components when loaded", () => {
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByTestId("insights")).toBeInTheDocument();
    });
});
