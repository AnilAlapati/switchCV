import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ProfileViewsCard } from "@/components/dashboard/ProfileViewsCard";
import { useAuth } from "@/hooks/useAuth";

// Mock the useAuth hook
jest.mock("@/hooks/useAuth");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

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

const mockUser = {
  uid: "test-user-id",
  email: "test@example.com",
} as any;

describe("ProfileViewsCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("shows loading state when user is available", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ProfileViewsCard />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("shows not loading when no user", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<ProfileViewsCard />);

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("No views yet")).toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("fetches metrics when user is available", async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileViews: 42 }),
      });

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ProfileViewsCard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/jobseeker/metrics?userId=test-user-id"
        );
      });
    });

    it("handles successful data fetch with multiple views", async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileViews: 42 }),
      });

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ProfileViewsCard />);

      await waitFor(() => {
        expect(screen.getByText("42")).toBeInTheDocument();
        expect(screen.getByText("42 profile views")).toBeInTheDocument();
      });
    });

    it("handles successful data fetch with single view", async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileViews: 1 }),
      });

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ProfileViewsCard />);

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("1 profile view")).toBeInTheDocument();
      });
    });

    it("handles zero profile views", async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profileViews: 0 }),
      });

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ProfileViewsCard />);

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("No views yet")).toBeInTheDocument();
      });
    });

    it("handles fetch error gracefully", async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      render(<ProfileViewsCard />);

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("No views yet")).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe("UI Rendering", () => {
    it("renders card structure correctly", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<ProfileViewsCard />);

      expect(screen.getByText("Profile Views")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("No views yet")).toBeInTheDocument();
    });

    it("renders eye icon", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<ProfileViewsCard />);

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });
});
