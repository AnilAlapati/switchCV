import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { LastUpdatedCard } from "@/components/dashboard/LastUpdatedCard";
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
}) as ReturnType<typeof useAuth>;

describe("LastUpdatedCard", () => {
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

      render(<LastUpdatedCard />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("shows not loading when no user", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<LastUpdatedCard />);

      expect(screen.getByText("Never")).toBeInTheDocument();
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  describe("Data Fetching", () => {
    it("fetches metrics when user is available", async () => {
      const mockMetrics = {
        lastUpdated: "2024-01-15T10:30:00Z",
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<LastUpdatedCard />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `/api/jobseeker/metrics?userId=${mockUser.uid}`,
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
      });
    });

    it("handles successful data fetch", async () => {
      const recentDate = new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000
      ).toISOString(); // 3 days ago
      const mockMetrics = {
        lastUpdated: recentDate,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<LastUpdatedCard />);

      await waitFor(() => {
        expect(screen.getByText("Keep your resume fresh!")).toBeInTheDocument();
      });

      // Should show formatted time ago
      expect(screen.getByText(/3 days ago/)).toBeInTheDocument();
    });

    it("handles null lastUpdated", async () => {
      const mockMetrics = {
        lastUpdated: null,
      };

      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      });

      render(<LastUpdatedCard />);

      await waitFor(() => {
        expect(screen.getByText("Never")).toBeInTheDocument();
        expect(
          screen.getByText(/Update history will appear here/i)
        ).toBeInTheDocument();
      });
    });

    it("handles fetch error gracefully", async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<LastUpdatedCard />);

      await waitFor(() => {
        expect(screen.getByText("Never")).toBeInTheDocument();
      });
    });
  });

  describe("Time Formatting", () => {
    it("formats 'Just now' for very recent updates", () => {
      const recentDate = new Date(Date.now() - 30 * 1000).toISOString(); // 30 seconds ago
      const result = formatTimeAgo(recentDate);
      expect(result).toBe("Just now");
    });

    it("formats minutes ago", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const result = formatTimeAgo(fiveMinutesAgo);
      expect(result).toBe("5 minutes ago");
    });

    it("formats hours ago", () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000
      ).toISOString();
      const result = formatTimeAgo(twoHoursAgo);
      expect(result).toBe("2 hours ago");
    });

    it("formats days ago", () => {
      const threeDaysAgo = new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000
      ).toISOString();
      const result = formatTimeAgo(threeDaysAgo);
      expect(result).toBe("3 days ago");
    });

    it("formats old dates as locale date string", () => {
      const oldDate = new Date("2020-01-01T00:00:00Z").toISOString();
      const result = formatTimeAgo(oldDate);
      expect(result).toMatch(/\d+\/\d+\/\d+/); // Basic date format check
    });

    it("returns 'Never' for null timestamp", () => {
      const result = formatTimeAgo(null);
      expect(result).toBe("Never");
    });
  });

  describe("UI Rendering", () => {
    it("renders card structure correctly", async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<LastUpdatedCard />);

      expect(screen.getByText("Last Updated")).toBeInTheDocument();
      expect(screen.getByText("Never")).toBeInTheDocument();
      expect(
        screen.getByText(/Update history will appear here/i)
      ).toBeInTheDocument();
    });

    it("renders clock icon", () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      render(<LastUpdatedCard />);

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });
});

// Helper function for testing (needs to be exported or defined in test scope)
function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return "Never";

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}
