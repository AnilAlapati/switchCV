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
  needsUsername: false,
  setUsername: jest.fn(),
  checkNeedsUsername: jest.fn().mockResolvedValue(false),
});

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
    mockUseAuth.mockReturnValue(createMockAuthContext(mockUser));
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        accessRequests: { pending: 0, approved: 0, denied: 0 },
      }),
    } as Response);
  });

  describe("Loading State", () => {
    it("displays loading state initially", async () => {
      // Mock fetch to never resolve - this keeps the component in loading state
      fetchSpy.mockImplementation(
        () => new Promise(() => { }) // Never resolves
      );

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      expect(screen.getByText("Candidates Contacted")).toBeInTheDocument();
      expect(screen.getByText("-")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      // Restore the normal mock for subsequent tests
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          accessRequests: { pending: 0, approved: 0, denied: 0 },
        }),
      } as Response);
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
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          `/api/recruiter/metrics?userId=${mockUser.uid}`,
          expect.objectContaining({
            signal: expect.any(Object),
          })
        );
      });
    });

    it("does not fetch metrics when user is null", async () => {
      mockUseAuth.mockReturnValue(createMockAuthContext(null));

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("Metrics Display", () => {
    it("displays metrics correctly when data is loaded", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 5,
          approved: 10,
          denied: 5,
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      await waitFor(() => {
        expect(screen.getByText("20")).toBeInTheDocument(); // 5 + 10 + 5
        expect(screen.getByText("Candidates Contacted")).toBeInTheDocument();
      });
    });

    it("displays zero metrics when no candidates contacted", async () => {
      const mockMetrics = {
        accessRequests: {
          pending: 0,
          approved: 0,
          denied: 0,
        },
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
        accessRequests: {
          pending: 1,
          approved: 0,
          denied: 0,
        },
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
        expect(screen.getByText("Candidates Contacted")).toBeInTheDocument();
      });
    });

    it("handles missing accessRequests data gracefully", async () => {
      const mockMetrics = {}; // No accessRequests property

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
        accessRequests: {
          pending: 2,
          approved: 3,
          denied: 0,
        },
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

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetrics),
      } as Response);

      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

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

    it("displays correct icon", async () => {
      await act(async () => {
        render(<CandidatesInteractedCard />);
      });

      const icon = document.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass("h-6", "w-6");
    });
  });
});
