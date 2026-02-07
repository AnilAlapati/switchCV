import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { RecruiterProfileViewsCard } from "@/components/dashboard/recruiter/RecruiterProfileViewsCard";
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
}) as ReturnType<typeof useAuth>;


describe("RecruiterProfileViewsCard", () => {
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
      render(<RecruiterProfileViewsCard />);

      expect(screen.getByText("Candidates Viewed")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("fetches metrics on mount when user exists", async () => {
      const mockMetrics = {
        totalProfileViews: 15,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          `/api/recruiter/metrics?userId=${mockUser.uid}`
        );
      });
    });

    it("does not fetch metrics when user is null", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<RecruiterProfileViewsCard />);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Metrics Display", () => {
    it("displays metrics correctly when data is loaded", async () => {
      const mockMetrics = {
        totalProfileViews: 25,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("25")).toBeInTheDocument();
        expect(screen.getByText("25 candidates viewed")).toBeInTheDocument();
      });
    });

    it("displays zero metrics when no candidates viewed", async () => {
      const mockMetrics = {
        totalProfileViews: 0,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates viewed yet")
        ).toBeInTheDocument();
      });
    });

    it("displays single candidate correctly", async () => {
      const mockMetrics = {
        totalProfileViews: 1,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("1 candidate viewed")).toBeInTheDocument();
      });
    });

    it("handles missing totalProfileViews data gracefully", async () => {
      const mockMetrics = {}; // No totalProfileViews property

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates viewed yet")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles fetch error gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates viewed yet")
        ).toBeInTheDocument();
      });
    });

    it("handles API error response gracefully", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates viewed yet")
        ).toBeInTheDocument();
      });
    });
  });

  describe("UI Rendering", () => {
    it("renders all UI elements correctly", async () => {
      const mockMetrics = {
        totalProfileViews: 5,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Candidates Viewed")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("5 candidates viewed")).toBeInTheDocument();
      });
    });

    it("applies correct styling classes", async () => {
      const mockMetrics = {
        totalProfileViews: 3,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<RecruiterProfileViewsCard />);
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

    it("displays correct icon", () => {
      render(<RecruiterProfileViewsCard />);

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
      // Updated to match new design with purple color
      expect(icon).toHaveClass("h-6", "w-6");
    });
  });
});
