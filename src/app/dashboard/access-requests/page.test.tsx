/**
 * Access Requests Dashboard Page Tests
 *
 * Tests for the access requests management page
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AccessRequestsPage from "./page";

// Mock next/navigation
const mockRouter = {
  replace: jest.fn(),
  refresh: jest.fn(),
  push: jest.fn(),
};
jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock useAuth hook
const mockUser = {
  uid: "test-user-123",
  email: "test@example.com",
  getIdToken: jest.fn().mockResolvedValue("mock-token"),
};
const mockLogout = jest.fn();
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    logout: mockLogout,
  }),
}));

// Mock DashboardMetricsContext
const mockRefreshMetrics = jest.fn();
jest.mock("@/context/DashboardMetricsContext", () => ({
  useOptionalDashboardMetricsContext: () => ({
    refreshJobSeekerMetrics: mockRefreshMetrics,
  }),
}));

// Mock DashboardHeader
jest.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: ({ onLogout }: any) => (
    <header>
      <button data-testid="logout-button" onClick={onLogout}>Logout</button>
    </header>
  ),
}));

// Mock DashboardBackground
jest.mock("@/components/dashboard/DashboardBackground", () => ({
  DashboardBackground: ({ children }: any) => <div>{children}</div>,
}));

// Mock useAccessRequests hook
const mockMutate = jest.fn();
jest.mock("@/hooks/useAccessRequests", () => ({
  useAccessRequests: jest.fn(),
}));
// Mock AccessRequestCard
jest.mock("@/components/access/AccessRequestCard", () => ({
  AccessRequestCard: ({ onDeny, onApprove, onPresetChange, onCustomDaysChange, request, activeTab }: any) => (
    <div data-testid={`request-card-${request.id}`}>
      <span>{request.fromUserName}</span>
      <span>{activeTab}</span>
      <button onClick={onDeny}>Deny</button>
      <button onClick={onApprove}>Approve</button>
      <button onClick={() => onPresetChange("7_days")}>Change Preset</button>
      <button onClick={() => onCustomDaysChange(10)}>Change Custom Days</button>
      <button data-testid="custom-days-0-button" onClick={() => onCustomDaysChange(0)}>Set Custom Days 0</button>
    </div>
  ),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { useAccessRequests } from "@/hooks/useAccessRequests";
import { logger } from "@/lib/logger";
import { fireEvent } from "@testing-library/react";

describe("AccessRequestsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [],
      loading: true,
      error: null,
      mutate: mockMutate,
    });
    render(<AccessRequestsPage />);

    expect(screen.getByText(/loading requests/i)).toBeInTheDocument();
  });

  it("renders empty state when no requests", async () => {
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    expect(screen.queryByText(/loading requests/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no pending access requests/i)).toBeInTheDocument();
  });

  it("renders pending requests", async () => {
    const mockRequests = [
      {
        id: "req-1",
        fromUserName: "Jane Recruiter",
        fromUserEmail: "jane@company.com",
        resumeTitle: "Software Engineer Resume",
        resumeId: "res-1",
        status: "pending",
        requestedFields: ["email", "phone"],
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        message: "I would like to discuss opportunities",
      },
    ];

    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: mockRequests,
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    expect(screen.getByText(/Jane Recruiter/i)).toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [],
      loading: false,
      error: "Failed to load requests",
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    expect(screen.getByText(/failed to load requests/i)).toBeInTheDocument();
  });

  it("displays tab navigation", async () => {
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    expect(screen.queryByText(/loading requests/i)).not.toBeInTheDocument();

    // Tabs are buttons, not role="tab"
    expect(
      screen.getByRole("button", { name: /pending/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /history/i })
    ).toBeInTheDocument();
  });

  it("switches tabs correctly", async () => {
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [
        { id: "req-1", status: "pending", fromUserName: "User1" },
        { id: "req-2", status: "approved", fromUserName: "User2" },
      ],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    expect(screen.getByText("User1")).toBeInTheDocument();
    expect(screen.queryByText("User2")).not.toBeInTheDocument();

    const historyTab = screen.getByRole("button", { name: /history/i });
    fireEvent.click(historyTab);

    expect(screen.queryByText("User1")).not.toBeInTheDocument();
    expect(screen.getByText("User2")).toBeInTheDocument();
  });

  it("handles logout", async () => {
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    const logoutButton = screen.getByTestId("logout-button");
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith("/auth");
    });
  });

  it("handles handleDeny success", async () => {
    const mockRequest = { id: "req-1", status: "pending", fromUserName: "User1", resumeId: "res-1" };
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [mockRequest],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    render(<AccessRequestsPage />);

    const denyButton = screen.getByText("Deny");
    fireEvent.click(denyButton);

    expect(mockMutate).toHaveBeenCalled();
    const mutateFn = mockMutate.mock.calls[0][0];
    const mockData = { requests: [mockRequest] };
    const result = mutateFn(mockData);
    expect(result.requests[0].status).toBe("denied");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/profiles/respond-access", expect.any(Object));
    });
  });

  it("handles handleDeny error", async () => {
    const mockRequest = { id: "req-1", status: "pending", fromUserName: "User1", resumeId: "res-1" };
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [mockRequest],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    render(<AccessRequestsPage />);

    const denyButton = screen.getByText("Deny");
    fireEvent.click(denyButton);

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalled();
      expect(mockMutate).toHaveBeenCalledTimes(2); // Optimistic + sync
    });
  });

  it("handles handleApprove success", async () => {
    const mockRequest = {
      id: "req-1",
      status: "pending",
      fromUserName: "User1",
      resumeId: "res-1",
      requestedDuration: { preset: "24_hours" }
    };
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [mockRequest],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    render(<AccessRequestsPage />);

    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    expect(mockMutate).toHaveBeenCalled();
    const mutateFn = mockMutate.mock.calls[0][0];
    const mockData = { requests: [mockRequest] };
    const result = mutateFn(mockData);
    expect(result.requests[0].status).toBe("approved");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/profiles/respond-access", expect.any(Object));
    });
  });

  it("handles handleApprove error", async () => {
    const mockRequest = {
      id: "req-1",
      status: "pending",
      fromUserName: "User1",
      resumeId: "res-1",
      requestedDuration: { preset: "24_hours" }
    };
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [mockRequest],
      loading: false,
      error: null,
      mutate: mockMutate,
    });
    global.fetch = jest.fn().mockRejectedValue(new Error("Approve failed"));

    render(<AccessRequestsPage />);

    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "Failed to approve");
      expect(mockMutate).toHaveBeenCalledTimes(2); // Optimistic + sync
    });
  });

  it("handles duration changes", () => {
    const mockRequest = { id: "req-1", status: "pending", fromUserName: "User1" };
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [mockRequest],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    const presetButton = screen.getByText("Change Preset");
    fireEvent.click(presetButton);

    const customButton = screen.getByText("Change Custom Days");
    fireEvent.click(customButton);
  });

  it("handles handleApprove validation failure", async () => {
    const mockRequest = {
      id: "req-1",
      status: "pending",
      fromUserName: "User1",
      resumeId: "res-1",
      requestedDuration: { preset: "24_hours", durationHours: 24 }
    };
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [mockRequest],
      loading: false,
      error: null,
      mutate: mockMutate,
    });

    render(<AccessRequestsPage />);

    // Change to custom days (triggers updateDurationState)
    const customDays0Button = screen.getByTestId("custom-days-0-button");
    fireEvent.click(customDays0Button);

    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    // Should NOT call mutate or fetch
    expect(mockMutate).toHaveBeenCalledTimes(1); // Only the initial load call
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handles logout error", async () => {
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [],
      loading: false,
      error: null,
      mutate: mockMutate,
    });
    mockLogout.mockRejectedValue(new Error("Logout failed"));

    render(<AccessRequestsPage />);

    const logoutButton = screen.getByTestId("logout-button");
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith({ err: expect.any(Error) }, "Failed to log out");
    });
  });

  it("calls refreshJobSeekerMetrics on approve", async () => {
    const mockRequest = {
      id: "req-1",
      status: "pending",
      fromUserName: "User1",
      resumeId: "res-1",
      requestedDuration: { preset: "24_hours" }
    };
    (useAccessRequests as jest.Mock).mockReturnValue({
      requests: [mockRequest],
      loading: false,
      error: null,
      mutate: mockMutate,
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    render(<AccessRequestsPage />);

    const approveButton = screen.getByText("Approve");
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockRefreshMetrics).toHaveBeenCalled();
    });
  });
});
