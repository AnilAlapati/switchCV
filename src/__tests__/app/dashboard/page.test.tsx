import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import Dashboard from "@/app/dashboard/page";
import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { useRouter } from "next/navigation";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useResume");
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

// Mock fetch
global.fetch = jest.fn();

describe("Dashboard", () => {
  const mockLogout = jest.fn();
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockRefresh = jest.fn();
  const mockRefetchResume = jest.fn();

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

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  it("renders loading state", () => {
    (useAuth as jest.Mock).mockReturnValue({
      loading: true,
    });

    render(<Dashboard />);
    expect(screen.getByText("Loading your dashboard…")).toBeInTheDocument();
  });

  it("redirects to auth if not logged in", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Dashboard />);
    expect(mockPush).toHaveBeenCalledWith("/auth?mode=verify-email");
  });

  it("redirects to auth if email verification needed", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "user123" },
      loading: false,
      needsEmailVerification: true,
    });

    render(<Dashboard />);
    expect(mockPush).toHaveBeenCalledWith("/auth?mode=verify-email");
  });

  it("renders job seeker dashboard by default", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("job-seeker-dashboard")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("recruiter-dashboard")).not.toBeInTheDocument();
  });

  it("renders recruiter dashboard if user is recruiter", async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes("/api/user/settings")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isRecruiter: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
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

  it("fetches job metrics", async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/jobseeker/metrics"),
        expect.anything()
      );
    });
  });

  it("fetches recruiter metrics when user is recruiter", async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes("/api/user/settings")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isRecruiter: true }),
        });
      }
      if (url.includes("/api/recruiter/metrics")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/recruiter/metrics"),
        expect.anything()
      );
    });
  });
});
