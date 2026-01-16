/**
 * Tests for SmartSearch Component
 *
 * Tests the AI-powered search UI for premium recruiters.
 *
 * Run with: npm test -- SmartSearch.test.tsx
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SmartSearch } from "@/components/search/SmartSearch";

// Mock useAuth hook
const mockUser = {
  uid: "user123",
  getIdToken: jest.fn().mockResolvedValue("mock-token"),
};

const mockUseAuth = jest.fn();
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("SmartSearch Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });
  });

  describe("Rendering States", () => {
    it("should show loading skeleton when auth is loading", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      render(<SmartSearch />);

      // Check for animated pulse elements (loading skeleton)
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    it("should show sign in prompt when user not authenticated", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(<SmartSearch />);

      expect(screen.getByText(/Sign in to use/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Sign In/i })).toHaveAttribute(
        "href",
        "/auth"
      );
    });

    it("should show search interface when user is authenticated", () => {
      render(<SmartSearch />);

      expect(
        screen.getByPlaceholderText(/Looking for a senior/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Analyze with AI/i).closest("button")
      ).toBeInTheDocument();
    });

    it("should display Premium badge", () => {
      render(<SmartSearch />);

      expect(screen.getByText("Premium")).toBeInTheDocument();
    });
  });

  describe("Search Input", () => {
    it("should update query on input change", async () => {
      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "React developer");

      expect(textarea).toHaveValue("React developer");
    });

    it("should show error for short queries", async () => {
      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "React");

      const button = screen.getByRole("button", { name: /Analyze with AI/i });
      fireEvent.click(button);

      expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    });

    it("should trigger search on Enter key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            totalResults: 0,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer with AWS");
      fireEvent.keyDown(textarea, { key: "Enter" });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it("should disable textarea while searching", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      results: [],
                      totalResults: 0,
                      quotaRemaining: 49,
                      quotaLimit: 50,
                    }),
                }),
              100
            )
          )
      );

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer with AWS");

      const button = screen.getByRole("button", { name: /Analyze with AI/i });
      fireEvent.click(button);

      // Button should show searching state
      await waitFor(() => {
        expect(screen.getByText(/Analyzing with AI Intelligence/i)).toBeInTheDocument();
      });
    });
  });

  describe("Search Results", () => {
    const mockResults = [
      {
        resumeId: 12345678,
        userId: "user1",
        score: 0.92,
        title: "Senior React Developer",
        skills: ["React", "TypeScript", "AWS", "Node.js"],
      },
      {
        resumeId: 87654321,
        userId: "user2",
        score: 0.78,
        title: "Full Stack Engineer",
        skills: ["JavaScript", "Python", "Docker"],
        matchReason: "Strong frontend experience",
      },
    ];

    it("should display search results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: mockResults,
            totalResults: 2,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer with AWS");

      const button = screen.getByRole("button", { name: /Analyze with AI/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Senior React Developer")).toBeInTheDocument();
        expect(screen.getByText("Full Stack Engineer")).toBeInTheDocument();
      });
    });

    it("should display match scores as percentages", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: mockResults,
            totalResults: 2,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer with AWS");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText("92% match")).toBeInTheDocument();
        expect(screen.getByText("78% match")).toBeInTheDocument();
      });
    });

    it("should display skills as tags", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: mockResults,
            totalResults: 2,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.getByText("TypeScript")).toBeInTheDocument();
      });
    });

    it("should display match reason when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: mockResults,
            totalResults: 2,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Strong frontend experience/)
        ).toBeInTheDocument();
      });
    });

    it("should show no results message when search returns empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            totalResults: 0,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Very specific unique query here");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText(/No matching profiles/)).toBeInTheDocument();
      });
    });

    it("should call onResultSelect when result is clicked", async () => {
      const onResultSelect = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: mockResults,
            totalResults: 2,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch onResultSelect={onResultSelect} />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText("Senior React Developer")).toBeInTheDocument();
      });

      // Click on the result card (the container div)
      const resultCards = document.querySelectorAll(".cursor-pointer");
      fireEvent.click(resultCards[0]);

      expect(onResultSelect).toHaveBeenCalledWith(mockResults[0]);
    });
  });

  describe("Quota Display", () => {
    it("should display quota after search", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            totalResults: 0,
            quotaRemaining: 47,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/47\/50 searches remaining/)
        ).toBeInTheDocument();
      });
    });

    it("should show unlimited for enterprise users", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            totalResults: 0,
            quotaRemaining: 999999,
            quotaLimit: -1,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText(/Unlimited searches/)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display quota exceeded error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            code: "QUOTA_EXCEEDED",
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText(/monthly search limit/)).toBeInTheDocument();
      });
    });

    it("should display tier not allowed error with upgrade link", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () =>
          Promise.resolve({
            code: "TIER_NOT_ALLOWED",
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText(/requires a Premium/)).toBeInTheDocument();
        expect(
          screen.getByRole("link", { name: /subscription plans/i })
        ).toHaveAttribute("href", "/settings/subscription");
      });
    });

    it("should display generic error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            message: "Internal server error",
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a React developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(screen.getByText(/Internal server error/)).toBeInTheDocument();
      });
    });

    it("should show sign in error when user not authenticated during search", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      render(<SmartSearch />);

      // This won't actually show the search UI since user is not authenticated
      // But we can verify the sign-in prompt is shown
      expect(screen.getByText(/Sign in to use/)).toBeInTheDocument();
    });
  });

  describe("API Integration", () => {
    it("should send correct request to API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            totalResults: 0,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(
        textarea,
        "Looking for a React developer with AWS experience"
      );
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/search/ai",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json",
              Authorization: "Bearer mock-token",
            }),
            body: expect.stringContaining(
              "Looking for a React developer with AWS experience"
            ),
          })
        );
      });
    });

    it("should include auth token in request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [],
            totalResults: 0,
            quotaRemaining: 49,
            quotaLimit: 50,
          }),
      });

      render(<SmartSearch />);

      const textarea = screen.getByPlaceholderText(/Looking for a senior/i);
      await userEvent.type(textarea, "Looking for a developer");
      fireEvent.click(screen.getByRole("button", { name: /Analyze with AI/i }));

      await waitFor(() => {
        expect(mockUser.getIdToken).toHaveBeenCalled();
      });
    });
  });
});
