import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { CandidatesSearchedCard } from "@/components/dashboard/recruiter/CandidatesSearchedCard";
import { useAuth } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockFetch = jest.fn();
global.fetch = mockFetch;
const fetchSpy = jest.spyOn(global, "fetch");

const buildMetricsResponse = (
  overrides: Partial<{
    totalSearches: number;
    searchBreakdown: {
      searchesLast24h: number;
      searchesLast7Days: number;
      uniqueCandidatesLast7Days: number;
    };
  }> = {}
) => ({
  totalSearches: overrides.totalSearches ?? 0,
  searchBreakdown: {
    searchesLast24h: overrides.searchBreakdown?.searchesLast24h ?? 0,
    searchesLast7Days: overrides.searchBreakdown?.searchesLast7Days ?? 0,
    uniqueCandidatesLast7Days:
      overrides.searchBreakdown?.uniqueCandidatesLast7Days ?? 0,
    topSkillsLast7Days: [],
    topLocationsLast7Days: [],
  },
});

const renderCard = async () => {
  await act(async () => {
    render(<CandidatesSearchedCard />);
    await Promise.resolve();
  });
};

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
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildMetricsResponse()),
    } as Response);
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

      expect(screen.getByText("Searches (last 7 days)")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("fetches metrics on mount when user exists", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(buildMetricsResponse({ totalSearches: 15 })),
      } as Response);

      await renderCard();

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
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildMetricsResponse({
              totalSearches: 25,
              searchBreakdown: {
                searchesLast7Days: 8,
                searchesLast24h: 2,
                uniqueCandidatesLast7Days: 5,
              },
            })
          ),
      } as Response);

      await renderCard();

      await waitFor(() => {
        expect(screen.getByText("8")).toBeInTheDocument();
        expect(
          screen.getByText("25 all-time · 5 unique candidates")
        ).toBeInTheDocument();
        expect(screen.getByText("2 in past 24h")).toBeInTheDocument();
      });
    });

    it("displays zero metrics when no searches performed", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(buildMetricsResponse()),
      } as Response);

      await renderCard();

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(
          screen.getByText("Start searching for candidates")
        ).toBeInTheDocument();
      });
    });

    it("displays single search correctly", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildMetricsResponse({
              totalSearches: 1,
              searchBreakdown: {
                searchesLast7Days: 1,
                searchesLast24h: 1,
                uniqueCandidatesLast7Days: 1,
              },
            })
          ),
      } as Response);

      await renderCard();

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(
          screen.getByText("1 all-time · 1 unique candidates")
        ).toBeInTheDocument();
        expect(screen.getByText("1 in past 24h")).toBeInTheDocument();
      });
    });

    it("handles missing totalSearches data gracefully", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await renderCard();

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

      await renderCard();

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

      await renderCard();

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
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildMetricsResponse({
              totalSearches: 5,
              searchBreakdown: { searchesLast7Days: 5 },
            })
          ),
      } as Response);

      await renderCard();

      await waitFor(() => {
        expect(screen.getByText("Searches (last 7 days)")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
      });
    });

    it("applies correct styling classes", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            buildMetricsResponse({
              totalSearches: 3,
              searchBreakdown: { searchesLast7Days: 3 },
            })
          ),
      } as Response);

      await renderCard();

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
      expect(icon).toHaveClass("h-6", "w-6");
    });
  });
});
