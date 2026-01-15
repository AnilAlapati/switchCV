import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Dashboard from "@/app/dashboard/page";
import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useRouter } from "next/navigation";
import { getVerificationRoute } from "@/lib/config";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useResume");
jest.mock("@/hooks/useUserProfile");
jest.mock("@/hooks/useDashboardMetrics");
jest.mock("next/navigation");

// Mock components
jest.mock("@/components/dashboard/DashboardBackground", () => ({
  DashboardBackground: ({ children }: any) => (
    <div data-testid="dashboard-background">{children}</div>
  ),
}));
jest.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: ({ onLogout }: any) => (
    <button onClick={onLogout}>Logout</button>
  ),
}));
jest.mock("@/components/dashboard/JobSeekerDashboard", () => ({
  JobSeekerDashboard: () => <div data-testid="job-seeker-dashboard" />,
}));
jest.mock("@/components/dashboard/RecruiterDashboard", () => ({
  RecruiterDashboard: () => <div data-testid="recruiter-dashboard" />,
}));
jest.mock("@/context/DashboardMetricsContext", () => ({
  DashboardMetricsProvider: ({ children }: any) => (
    <div data-testid="metrics-provider">{children}</div>
  ),
}));

describe("Dashboard", () => {
  const VERIFICATION_ROUTE = getVerificationRoute();
  const mockLogout = jest.fn();
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockRefresh = jest.fn();
  const mockRefetchResume = jest.fn();
  const mockRefreshJobMetrics = jest.fn();
  const mockRefreshRecruiterMetrics = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      refresh: mockRefresh,
    });

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: "user123",
        email: "test@example.com",
        getIdToken: jest.fn().mockResolvedValue("token"),
      },
      logout: mockLogout,
      loading: false,
      needsEmailVerification: false,
    });

    (useResume as jest.Mock).mockReturnValue({
      hasResume: false,
      resumeId: null,
      loading: false,
      resume: null,
      resumes: [],
      refetch: mockRefetchResume,
    });

    (useUserProfile as jest.Mock).mockReturnValue({
      profile: { uid: "user123", role: "jobseeker" },
      tier: "basic",
      role: "jobseeker",
      loading: false,
      error: null,
      mutate: jest.fn(),
    });

    (useDashboardMetrics as jest.Mock).mockReturnValue({
      jobSeekerMetrics: {
        totalResumes: 0,
        totalApplications: 0,
        interviewRate: 0,
      },
      recruiterMetrics: { totalJobs: 0, totalCandidates: 0, activeJobs: 0 },
      loading: false,
      error: null,
      refreshJobSeekerMetrics: mockRefreshJobMetrics,
      refreshRecruiterMetrics: mockRefreshRecruiterMetrics,
    });
  });

  it("renders loading state", () => {
    (useAuth as jest.Mock).mockReturnValue({
      loading: true,
    });

    render(<Dashboard />);
    expect(screen.getByText("Loading dashboard...")).toBeInTheDocument();
  });

  it("redirects to auth if not logged in", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Dashboard />);
    expect(mockPush).toHaveBeenCalledWith(VERIFICATION_ROUTE);
  });

  it("redirects to auth if email verification needed", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "user123" },
      loading: false,
      needsEmailVerification: true,
    });

    render(<Dashboard />);
    expect(mockPush).toHaveBeenCalledWith(VERIFICATION_ROUTE);
  });

  it("renders job seeker dashboard by default", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("job-seeker-dashboard")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("recruiter-dashboard")).not.toBeInTheDocument();
  });

  it("renders recruiter dashboard if user is recruiter", async () => {
    (useUserProfile as jest.Mock).mockReturnValue({
      role: "recruiter",
      loading: false,
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("recruiter-dashboard")).toBeInTheDocument();
    });
    expect(
      screen.queryByTestId("job-seeker-dashboard")
    ).not.toBeInTheDocument();
  });

  it("handles logout", async () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/auth");
    });
  });
});
