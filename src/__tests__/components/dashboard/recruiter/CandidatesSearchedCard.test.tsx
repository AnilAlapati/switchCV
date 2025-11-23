import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { CandidatesSearchedCard } from "@/components/dashboard/recruiter/CandidatesSearchedCard";
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

describe("CandidatesSearchedCard", () => {
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
      render(<CandidatesSearchedCard />);

      expect(screen.getByText("Candidates Searched")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("fetches metrics on mount when user exists", async () => {
      const mockMetrics = {
        totalSearches: 15,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
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

      render(<CandidatesSearchedCard />);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Metrics Display", () => {
    it("displays metrics correctly when data is loaded", async () => {
      const mockMetrics = {
        totalSearches: 25,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("25")).toBeInTheDocument();
        expect(screen.getByText("25 searches performed")).toBeInTheDocument();
      });
    });

    it("displays zero metrics when no searches performed", async () => {
      const mockMetrics = {
        totalSearches: 0,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("Start searching for candidates")
        ).toBeInTheDocument();
      });
    });

    it("displays single search correctly", async () => {
      const mockMetrics = {
        totalSearches: 1,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("1 search performed")).toBeInTheDocument();
      });
    });

    it("handles missing totalSearches data gracefully", async () => {
      const mockMetrics = {}; // No totalSearches property

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("Start searching for candidates")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles fetch error gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("Start searching for candidates")
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
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("Start searching for candidates")
        ).toBeInTheDocument();
      });
    });
  });

  describe("UI Rendering", () => {
    it("renders all UI elements correctly", async () => {
      const mockMetrics = {
        totalSearches: 5,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesSearchedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Candidates Searched")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("5 searches performed")).toBeInTheDocument();
      });
    });

    it("applies correct styling classes", async () => {
      const mockMetrics = {
        totalSearches: 3,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesSearchedCard />);
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
      render(<CandidatesSearchedCard />);

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
      // Updated to match new design with cyan color
      expect(icon).toHaveClass("h-6", "w-6");
    });
  });
});
