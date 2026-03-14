import { render, screen } from "@testing-library/react";
import AiMonitoringPage from "./page";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAiMonitoring } from "@/hooks/useAiMonitoring";
import { useRouter } from "next/navigation";

// Mock the hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("@/hooks/useAiMonitoring");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("AiMonitoringPage", () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
    (useAuth as jest.Mock).mockReturnValue({ user: { uid: "123" }, loading: false });
    (useUserProfile as jest.Mock).mockReturnValue({ role: "admin", loading: false });
    (useAiMonitoring as jest.Mock).mockReturnValue({ loading: false, data: undefined });
  });

  it("renders the dashboard skeleton while loading", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    
    // AdminDashboardSkeleton has animate-pulse classes
    const { container } = render(<AiMonitoringPage />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("redirects non-admin users to dashboard", () => {
    (useUserProfile as jest.Mock).mockReturnValue({ role: "user", loading: false });
    (useAiMonitoring as jest.Mock).mockReturnValue({ loading: false, data: null });
    
    render(<AiMonitoringPage />);
    expect(mockRouterPush).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the overview section with data", () => {
    const mockData = {
      overview: {
        openIncidentCount: 1,
        latestDailyMetrics: {
           totalRequests: 100,
           failedRequests: 5,
           successfulRequests: 80,
           fallbackRecoveredRequests: 10,
           userVisibleFailures: 5
        }
      },
      openIncidents: { "inc-1": { key: "inc-1", title: "Test Incident", severity: "warning", summary: "Test", startedAt: new Date().toISOString() } }
    };

    (useAiMonitoring as jest.Mock).mockReturnValue({ loading: false, data: mockData });

    render(<AiMonitoringPage />);
    
    // Should see the title
    expect(screen.getByText("AI Monitoring")).toBeInTheDocument();
    
    // Should see the open incident count
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
