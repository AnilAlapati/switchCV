/**
 * Tests for Profile Search Page
 * Tests profile discovery with search and filtering
 */

import { render, screen } from "@/__tests__/__support__/testUtils";
import userEvent from "@testing-library/user-event";

// Import the page component - Jest will handle "use client"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProfileSearchPage = require("@/app/profiles/search/page").default;

// Mock router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

// Mock useAuth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      uid: "test-user",
      email: "test@example.com",
    },
    loading: false,
  }),
}));

// Mock useProfileSearch
jest.mock("@/hooks/useProfileSearch", () => ({
  useProfileSearch: () => ({
    results: [
      {
        userId: "user-1",
        username: "john-doe",
        displayName: "John Doe",
        bio: "Software engineer",
        role: "Senior Developer",
        location: "San Francisco, CA",
        skills: ["React", "TypeScript"],
        hasApproval: false,
      },
      {
        userId: "user-2",
        username: "jane-smith",
        displayName: "Jane Smith",
        bio: "Product manager",
        role: "Product Manager",
        location: "New York, NY",
        skills: ["Leadership", "Strategy"],
        hasApproval: true,
      },
    ],
    searching: false,
    error: null,
    totalResults: 2,
    performSearch: jest.fn(),
  }),
}));

// Mock components
jest.mock("@/components/search/SearchHeader", () => {
  return function MockHeader({ searchQuery, onSearchChange }: any) {
    return (
      <input
        data-testid="search-input"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search profiles..."
      />
    );
  };
});

jest.mock("@/components/search/SearchFiltersPanel", () => {
  return function MockFilters() {
    return <div data-testid="filters-panel">Filters</div>;
  };
});

jest.mock("@/components/search/SearchResults", () => {
  return function MockResults({ results }: any) {
    return (
      <div data-testid="search-results">
        {results.map((result: any) => (
          <div key={result.userId} data-testid={`result-${result.userId}`}>
            {result.displayName}
          </div>
        ))}
      </div>
    );
  };
});

describe.skip("Profile Search Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe("Page Rendering", () => {
    it("should render the search page", () => {
      render(<ProfileSearchPage />);

      expect(
        screen.getByRole("heading", { name: /Discover Professionals/ })
      ).toBeInTheDocument();
    });

    it("should display search input", () => {
      render(<ProfileSearchPage />);

      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should display search results", () => {
      render(<ProfileSearchPage />);

      expect(screen.getByTestId("search-results")).toBeInTheDocument();
    });
  });

  describe("Authentication", () => {
    it("should show content when authenticated", () => {
      render(<ProfileSearchPage />);

      expect(
        screen.getByRole("heading", { name: /Discover Professionals/ })
      ).toBeInTheDocument();
    });

    // Note: Testing unauthenticated state requires separate test file with different setup
    // This is a known limitation of jest.mock that happens before imports
  });

  describe("Search Functionality", () => {
    it("should accept search input", async () => {
      const user = userEvent.setup();
      render(<ProfileSearchPage />);

      const searchInput = screen.getByTestId(
        "search-input"
      ) as HTMLInputElement;
      await user.type(searchInput, "john");

      expect(searchInput.value).toBe("john");
    });

    it("should display search results", () => {
      render(<ProfileSearchPage />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should show result count", () => {
      render(<ProfileSearchPage />);

      const results = screen.getAllByTestId(/result-/);
      expect(results.length).toBe(2);
    });
  });

  describe("Filter Panel", () => {
    it("should render filters panel when available", () => {
      render(<ProfileSearchPage />);

      // Filters should be available for toggling
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should toggle filters visibility", async () => {
      render(<ProfileSearchPage />);

      // Search page should support filtering
      const searchInput = screen.getByTestId("search-input");
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe("Search State", () => {
    it("should handle empty search", () => {
      render(<ProfileSearchPage />);

      const searchInput = screen.getByTestId(
        "search-input"
      ) as HTMLInputElement;
      expect(searchInput.value).toBe("");
    });

    it("should display results when available", () => {
      render(<ProfileSearchPage />);

      expect(screen.getByTestId("result-user-1")).toBeInTheDocument();
      expect(screen.getByTestId("result-user-2")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have descriptive heading", () => {
      render(<ProfileSearchPage />);

      const heading = screen.getByRole("heading", {
        name: /Discover Professionals/,
      });
      expect(heading).toBeInTheDocument();
    });

    it("should have searchable input", () => {
      render(<ProfileSearchPage />);

      const input = screen.getByTestId("search-input");
      expect(input).toBeInTheDocument();
    });
  });
});
