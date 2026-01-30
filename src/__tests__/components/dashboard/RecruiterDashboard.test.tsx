import { render, screen, fireEvent } from "@testing-library/react";
import { RecruiterDashboard } from "@/components/dashboard/RecruiterDashboard";

// Mock sub-components
jest.mock("@/components/dashboard/ActionPlanCard", () => ({ ActionPlanCard: () => <div /> }));
jest.mock("@/components/dashboard/OpportunityInsightsCard", () => ({
    OpportunityInsightsCard: ({ title }: any) => <div data-testid="insights">{title}</div>
}));
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

    it("renders pipeline insights panel", () => {
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByText("Pipeline Insights")).toBeInTheDocument();
        expect(screen.getByText("Try Now →")).toBeInTheDocument();
    });

    it("renders AI Discovery banner with correct text", () => {
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByText(/AI-Powered Talent Discovery/i)).toBeInTheDocument();
        expect(screen.getByText(/Try Now →/i)).toBeInTheDocument();
    });


    it("renders AI Discovery banner with correct text", () => {
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByText(/AI-Powered Talent Discovery/i)).toBeInTheDocument();
        expect(screen.getByText(/Try Now →/i)).toBeInTheDocument();
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
