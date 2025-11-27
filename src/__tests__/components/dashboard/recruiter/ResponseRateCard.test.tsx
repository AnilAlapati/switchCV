import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ResponseRateCard } from "@/components/dashboard/recruiter/ResponseRateCard";
import { useAuth } from "@/hooks/useAuth";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Spy on the global fetch function
const fetchSpy = jest.spyOn(global, "fetch");

const createMockAuthContext = (user: any) => ({
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
});


describe("ResponseRateCard", () => {
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
    fetchSpy.mockClear();
    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
  });

  describe("Loading State", () => {
    it("displays loading state initially", () => {
      render(<ResponseRateCard />);

      expect(screen.getByText("Acceptance Rate")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
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

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<ResponseRateCard />);
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          `/api/recruiter/metrics?userId=${mockUser.uid}`
        );
      });
    });

    it("does not fetch metrics when user is null", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<ResponseRateCard />);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  describe("Metrics Display", () => {
    it("displays metrics correctly when data is loaded", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 5,
          approved: 8,
          denied: 2,
        },
      };
      // Total processed = 8 + 2 = 10
      // Rate = 8/10 = 80%

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<ResponseRateCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("80%")).toBeInTheDocument();
        expect(screen.getByText("8 approved / 10 total")).toBeInTheDocument();
      });
    });

    it("displays zero metrics when no requests processed", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 5,
          approved: 0,
          denied: 0,
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<ResponseRateCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(
          screen.getByText("No requests processed yet")
        ).toBeInTheDocument();
      });
    });

    it("handles missing accessRequests data gracefully", async () => {
      const mockMetrics = {}; // No accessRequests property

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<ResponseRateCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(
          screen.getByText("No requests processed yet")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles fetch error gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        render(<ResponseRateCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(
          screen.getByText("No requests processed yet")
        ).toBeInTheDocument();
      });
    });
  });

  describe("UI Rendering", () => {
    it("applies correct styling classes", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 1,
          approved: 1,
          denied: 1,
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<ResponseRateCard />);
      });

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
  });
});
