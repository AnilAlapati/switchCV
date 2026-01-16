import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
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

const createMockAuthContext = (user: { uid: string; email: string } | null) => ({
  user,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  logout: jest.fn(),
  needsEmailVerification: false,
  verificationEmail: null,
  connectivityIssue: null,
  signInWithGoogle: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn(),
  updateEmail: jest.fn(),
  deleteAccount: jest.fn(),
  resendVerificationEmail: jest.fn(),
  refreshUser: jest.fn(),
  needsUsername: false,
  setUsername: jest.fn(),
  checkNeedsUsername: jest.fn().mockResolvedValue(false),
});


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
    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accessRequests: { pending: 0, approved: 0, denied: 0 } }),
    });
  });

  describe("Loading State", () => {
    it("displays loading state initially", async () => {
      await act(async () => {
        render(<AccessRequestsCard />);
      });

      expect(screen.getByText("Access Inquiries")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("No pending requests")).toBeInTheDocument();
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

    it("does not fetch metrics when user is null", async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      await act(async () => {
        render(<AccessRequestsCard />);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.getByText("0")).toBeInTheDocument();
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
        expect(screen.getByText("3")).toBeInTheDocument(); // pending
        expect(screen.getByText("3 requests waiting")).toBeInTheDocument();
      });
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
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("No pending requests")).toBeInTheDocument();
      });
    });

    it("displays single request correctly", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 1,
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
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("1 request waiting")).toBeInTheDocument();
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
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("No pending requests")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles fetch error gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<AccessRequestsCard />);

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("No pending requests")).toBeInTheDocument();
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
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("No pending requests")).toBeInTheDocument();
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
        expect(screen.getByText("Access Inquiries")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument(); // pending count
        expect(screen.getByText("2 requests waiting")).toBeInTheDocument();
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
        const card = document.querySelector(".border-black");
        expect(card).toHaveClass(
          "bg-white",
          "border-2",
          "border-black",
          "p-6",
          "transition-all"
        );
      });
    });
  });
});
