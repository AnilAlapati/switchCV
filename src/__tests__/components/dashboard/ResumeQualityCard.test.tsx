import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ResumeQualityCard } from "@/components/dashboard/ResumeQualityCard";
import { useAuth } from "@/hooks/useAuth";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

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

describe("ResumeQualityCard", () => {
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
  });

  describe("Loading State", () => {
    it("shows loading state when user is available", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ResumeQualityCard />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("shows not loading when no user", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<ResumeQualityCard />);

      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("fetches metrics when user is available", async () => {
      const mockMetrics = {
        quality: 85,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<ResumeQualityCard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/jobseeker/metrics?userId=${mockUser.uid}`
        );
      });
    });

    it("handles successful data fetch with high quality", async () => {
      const mockMetrics = {
        quality: 85,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<ResumeQualityCard />);

      await waitFor(() => {
        expect(screen.getByText("85%")).toBeInTheDocument();
        expect(screen.getByText("Well optimized resume")).toBeInTheDocument();
      });
    });

    it("handles successful data fetch with good quality", async () => {
      const mockMetrics = {
        quality: 70,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<ResumeQualityCard />);

      await waitFor(() => {
        expect(screen.getByText("70%")).toBeInTheDocument();
        expect(screen.getByText("Good resume quality")).toBeInTheDocument();
      });
    });

    it("handles successful data fetch with low quality", async () => {
      const mockMetrics = {
        quality: 45,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<ResumeQualityCard />);

      await waitFor(() => {
        expect(screen.getByText("45%")).toBeInTheDocument();
        expect(
          screen.getByText("Resume needs improvement")
        ).toBeInTheDocument();
      });
    });

    it("handles zero quality score", async () => {
      const mockMetrics = {
        quality: 0,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<ResumeQualityCard />);

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(
          screen.getByText(/Generate your first analysis to view quality/i)
        ).toBeInTheDocument();
      });
    });

    it("handles fetch error gracefully", async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ResumeQualityCard />);

      await waitFor(() => {
        expect(screen.getByText("0%")).toBeInTheDocument();
      });
    });
  });

  describe("Progress Bar", () => {
    it("renders progress bar with correct width", async () => {
      const mockMetrics = {
        quality: 75,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<ResumeQualityCard />);

      await waitFor(() => {
        const progressBar = document.querySelector(".w-full .bg-gradient-to-r");
        expect(progressBar?.getAttribute("style")).toContain("width: 75%");
      });
    });

    it("renders progress bar with 0% width when loading", () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quality: 0 }),
      });

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ResumeQualityCard />);

      const progressBar = document.querySelector(".w-full .bg-gradient-to-r");
      expect(progressBar?.getAttribute("style")).toContain("width: 0%");
    });
  });

  describe("UI Rendering", () => {
    it("renders card structure correctly", async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<ResumeQualityCard />);

      expect(screen.getByText("Resume Quality")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
      expect(
        screen.getByText(/Generate your first analysis to view quality/i)
      ).toBeInTheDocument();
    });

    it("renders checkmark icon", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<ResumeQualityCard />);

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });
});
