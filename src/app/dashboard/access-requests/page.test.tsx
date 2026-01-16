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
jest.mock("@/context/DashboardMetricsContext", () => ({
  useOptionalDashboardMetricsContext: () => null,
}));

// Mock useAccessRequests hook
const mockMutate = jest.fn();
jest.mock("@/hooks/useAccessRequests", () => ({
  useAccessRequests: jest.fn(),
}));

import { useAccessRequests } from "@/hooks/useAccessRequests";

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
});
