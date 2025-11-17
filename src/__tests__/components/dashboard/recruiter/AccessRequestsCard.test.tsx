import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AccessRequestsCard } from "@/components/dashboard/recruiter/AccessRequestsCard";
import { useAuth } from "@/hooks/useAuth";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("AccessRequestsCard", () => {
  const mockUser = {
    uid: "test-user-id",
    email: "test@example.com",
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: "",
    tenantId: null,
    delete: jest.fn(),
    getIdToken: jest.fn(),
    getIdTokenResult: jest.fn(),
    reload: jest.fn(),
    toJSON: jest.fn(),
    displayName: null,
    phoneNumber: null,
    photoURL: null,
    providerId: "",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      logout: jest.fn(),
    });
  });

  describe("Loading State", () => {
    it("displays loading state initially", () => {
      render(<AccessRequestsCard />);

      expect(screen.getByText("Access Requests")).toBeInTheDocument();
      expect(screen.getAllByText("-")).toHaveLength(4); // total, pending, approved, denied
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("fetches metrics on mount when user exists", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 5,
          approved: 10,
          denied: 2,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/recruiter/metrics?userId=${mockUser.uid}`
        );
      });
    });

    it("does not fetch metrics when user is null", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        logout: jest.fn(),
      });

      render(<AccessRequestsCard />);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.getAllByText("0")).toHaveLength(4); // total, pending, approved, denied
    });
  });

  describe("Metrics Display", () => {
    it("displays metrics correctly when data is loaded", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 3,
          approved: 7,
          denied: 1,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getByText("11")).toBeInTheDocument(); // total
        expect(screen.getByText("3")).toBeInTheDocument(); // pending
        expect(screen.getByText("7")).toBeInTheDocument(); // approved
        expect(screen.getByText("1")).toBeInTheDocument(); // denied
      });

      expect(screen.getByText("11 total requests")).toBeInTheDocument();
    });

    it("displays zero metrics when no requests exist", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 0,
          approved: 0,
          denied: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getAllByText("0")).toHaveLength(4); // total, pending, approved, denied
        expect(screen.getByText("No access requests")).toBeInTheDocument();
      });
    });

    it("displays single request correctly", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 0,
          approved: 1,
          denied: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getByText("1 total request")).toBeInTheDocument();
      });
    });

    it("handles missing accessRequests data gracefully", async () => {
      const mockMetrics = {}; // No accessRequests property

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getAllByText("0")).toHaveLength(4); // total, pending, approved, denied
        expect(screen.getByText("No access requests")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles fetch error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getAllByText("0")).toHaveLength(4); // total, pending, approved, denied
        expect(screen.getByText("No access requests")).toBeInTheDocument();
      });
    });

    it("handles API error response gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getAllByText("0")).toHaveLength(4); // total, pending, approved, denied
        expect(screen.getByText("No access requests")).toBeInTheDocument();
      });
    });
  });

  describe("UI Rendering", () => {
    it("renders all UI elements correctly", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 2,
          approved: 4,
          denied: 1,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getByText("Access Requests")).toBeInTheDocument();
        expect(screen.getByText("7")).toBeInTheDocument(); // total
        expect(screen.getByText("Pending")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument(); // pending count
        expect(screen.getByText("Approved")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument(); // approved count
        expect(screen.getByText("Denied")).toBeInTheDocument();
        expect(screen.getByText("1")).toBeInTheDocument(); // denied count
        expect(screen.getByText("7 total requests")).toBeInTheDocument();
      });
    });

    it("applies correct styling classes", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 1,
          approved: 1,
          denied: 1,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        const card = document.querySelector(".backdrop-blur-xl");
        expect(card).toHaveClass(
          "backdrop-blur-xl",
          "bg-white/10",
          "rounded-3xl",
          "border",
          "border-white/20"
        );
      });
    });

    it("displays correct colors for different metric types", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 1,
          approved: 1,
          denied: 1,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<AccessRequestsCard />);

      await waitFor(() => {
        // Check that the numbers have the correct color classes
        const pendingElements = screen.getAllByText("1");
        expect(pendingElements).toHaveLength(3); // pending, approved, denied

        // Find elements by their context - check the parent containers
        const pendingContainer = screen.getByText("Pending").parentElement;
        const approvedContainer = screen.getByText("Approved").parentElement;
        const deniedContainer = screen.getByText("Denied").parentElement;

        expect(
          pendingContainer?.querySelector(".text-yellow-400")
        ).toBeInTheDocument();
        expect(
          approvedContainer?.querySelector(".text-green-400")
        ).toBeInTheDocument();
        expect(
          deniedContainer?.querySelector(".text-red-400")
        ).toBeInTheDocument();
      });
    });
  });
});
