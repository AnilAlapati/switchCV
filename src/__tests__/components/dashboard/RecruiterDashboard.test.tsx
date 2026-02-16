import { render, screen, fireEvent } from "@testing-library/react";
import { RecruiterDashboard } from "@/components/dashboard/RecruiterDashboard";

// Mock sub-components
jest.mock("@/components/dashboard/ActionPlanCard", () => ({ ActionPlanCard: () => <div /> }));
jest.mock("@/components/dashboard/OpportunityInsightsCard", () => ({
    OpportunityInsightsCard: ({ title }: any) => <div data-testid="insights">{title}</div>
}));
jest.mock("@/components/dashboard/ResourceLinksCard", () => ({ ResourceLinksCard: () => <div /> }));
jest.mock("@/components/dashboard/RecruiterSearchBox", () => ({ RecruiterSearchBox: () => <div /> }));
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

jest.mock("@/hooks/useUserProfile", () => ({
    useUserProfile: jest.fn(() => ({
        profile: { displayName: "Test Recruiter" },
        loading: false,
    })),
}));

jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(() => ({
        user: { uid: "test-uid" },
        loading: false,
    })),
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
    });

    it("renders personalized greeting when loaded", () => {
        render(
            <RecruiterDashboard
                metrics={{} as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByText(/Good evening/i)).toBeInTheDocument();
        expect(screen.getByText(/Test Recruiter/i)).toBeInTheDocument();
    });

    it("renders market insights (top skills) section", () => {
        render(
            <RecruiterDashboard
                metrics={{
                    searchBreakdown: {
                        uniqueCandidatesLast7Days: 10,
                        topSkillsLast7Days: [
                            { name: "Python", count: 8 },
                            { name: "Java", count: 2 }
                        ]
                    }
                } as any}
                metricsLoading={false}
            />
        );
        expect(screen.getByText(/Market Insights/i)).toBeInTheDocument();
        expect(screen.getByText("Python")).toBeInTheDocument();
        expect(screen.getByText("80%")).toBeInTheDocument(); // 8/10
        expect(screen.getByText("Java")).toBeInTheDocument();
        expect(screen.getByText("20%")).toBeInTheDocument(); // 2/10
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
