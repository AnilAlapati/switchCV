import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { CandidatesInteractedCard } from "@/components/dashboard/recruiter/CandidatesInteractedCard";
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

describe("CandidatesInteractedCard", () => {
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
      render(<CandidatesInteractedCard />);

      expect(screen.getByText("Candidates Contacted")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("fetches metrics on mount when user exists", async () => {
      const mockMetrics = {
        totalCandidatesInteracted: 15,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
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

      render(<CandidatesInteractedCard />);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Metrics Display", () => {
    it("displays metrics correctly when data is loaded", async () => {
      const mockMetrics = {
        totalCandidatesInteracted: 25,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("25")).toBeInTheDocument();
        expect(screen.getByText("25 candidates contacted")).toBeInTheDocument();
      });
    });

    it("displays zero metrics when no candidates contacted", async () => {
      const mockMetrics = {
        totalCandidatesInteracted: 0,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates contacted yet")
        ).toBeInTheDocument();
      });
    });

    it("displays single candidate correctly", async () => {
      const mockMetrics = {
        totalCandidatesInteracted: 1,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByText("1 candidate contacted")).toBeInTheDocument();
      });
    });

    it("handles missing totalCandidatesInteracted data gracefully", async () => {
      const mockMetrics = {}; // No totalCandidatesInteracted property

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates contacted yet")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles fetch error gracefully", async () => {
      fetchSpy.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates contacted yet")
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
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("No candidates contacted yet")
        ).toBeInTheDocument();
      });
    });
  });

  describe("UI Rendering", () => {
    it("renders all UI elements correctly", async () => {
      const mockMetrics = {
        totalCandidatesInteracted: 5,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("Candidates Contacted")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("5 candidates contacted")).toBeInTheDocument();
      });
    });

    it("applies correct styling classes", async () => {
      const mockMetrics = {
        totalCandidatesInteracted: 3,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
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
      render(<CandidatesInteractedCard />);

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("h-6", "w-6", "text-white");
    });
  });
});
