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

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("AccessRequestsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<AccessRequestsPage />);

    expect(screen.getByText(/loading requests/i)).toBeInTheDocument();
  });

  it("renders empty state when no requests", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ requests: [] }),
    });

    render(<AccessRequestsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading requests/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/no pending access requests/i)).toBeInTheDocument();
  });

  it("renders pending requests", async () => {
    const mockRequests = [
      {
        id: "req-1",
        fromUserName: "Jane Recruiter",
        fromUserEmail: "jane@company.com",
        resumeTitle: "Software Engineer Resume",
        status: "pending",
        requestedFields: ["email", "phone"],
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        message: "I would like to discuss opportunities",
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ requests: mockRequests }),
    });

    render(<AccessRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Jane Recruiter/i)).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<AccessRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load requests/i)).toBeInTheDocument();
    });
  });

  it("handles fetch exception gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<AccessRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText(/error occurred/i)).toBeInTheDocument();
    });
  });

  it("fetches requests with correct authorization header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ requests: [] }),
    });

    render(<AccessRequestsPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/jobseeker/access-requests"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
          }),
        })
      );
    });
  });

  it("displays tab navigation", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ requests: [] }),
    });

    render(<AccessRequestsPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading requests/i)).not.toBeInTheDocument();
    });

    // Tabs are buttons, not role="tab"
    expect(
      screen.getByRole("button", { name: /pending/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /history/i })
    ).toBeInTheDocument();
  });
});
