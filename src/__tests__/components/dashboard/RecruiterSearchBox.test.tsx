import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecruiterSearchBox } from "@/components/dashboard/RecruiterSearchBox";

const mockGetIdToken = jest.fn();

// Mock useAuth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      uid: "recruiter-123",
      email: "recruiter@example.com",
      getIdToken: mockGetIdToken,
    },
    loading: false,
  }),
}));

// Mock useTier
jest.mock("@/hooks/useTier", () => ({
  useTier: () => ({
    tier: "premium",
    loading: false,
    error: null,
    isBasic: false,
    isPremium: true,
    isEnterprise: false,
    isPremiumOrHigher: true,
    refetch: jest.fn(),
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("RecruiterSearchBox", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIdToken.mockResolvedValue("mock-token");
  });

  it("renders the search box with header and form", () => {
    render(<RecruiterSearchBox />);

    expect(screen.getByText("Resume Search")).toBeInTheDocument();
    expect(screen.getByText("AI Search")).toBeInTheDocument();
    expect(screen.getByText("Basic Lookup")).toBeInTheDocument();
    expect(screen.getByText("Premium Filters")).toBeInTheDocument();
  });

  it("starts in AI search mode by default", () => {
    render(<RecruiterSearchBox />);

    // AI mode should show the AI search textarea
    expect(
      screen.getByPlaceholderText(/Looking for a Java developer/i)
    ).toBeInTheDocument();
    // Basic mode input should not be visible
    expect(screen.queryByPlaceholderText("e.g., 2")).not.toBeInTheDocument();
    // Premium mode fields should not be visible
    expect(
      screen.queryByPlaceholderText("e.g., React, Python, AWS")
    ).not.toBeInTheDocument();
  });

  it("switches to basic mode when basic button is clicked", async () => {
    render(<RecruiterSearchBox />);

    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    // Basic mode should show the basic search input
    expect(screen.getByPlaceholderText("e.g., 2")).toBeInTheDocument();
    // AI mode textarea should not be visible
    expect(
      screen.queryByPlaceholderText(/Looking for a Java developer/i)
    ).not.toBeInTheDocument();
  });

  it("switches to premium mode when premium button is clicked", async () => {
    render(<RecruiterSearchBox />);

    const premiumButton = screen.getByText("Premium Filters");
    await userEvent.click(premiumButton);

    // Premium mode fields should be visible
    expect(
      screen.getByPlaceholderText("e.g., React, Python, AWS")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("City, region, or remote")
    ).toBeInTheDocument();
    // AI mode textarea should not be visible
    expect(
      screen.queryByPlaceholderText(/Looking for a Java developer/i)
    ).not.toBeInTheDocument();
  });

  it("switches back to AI mode when AI button is clicked", async () => {
    render(<RecruiterSearchBox />);

    // Switch to basic first
    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    // Switch back to AI
    const aiButton = screen.getByText("AI Search");
    await userEvent.click(aiButton);

    // AI mode textarea should be visible again
    expect(
      screen.getByPlaceholderText(/Looking for a Java developer/i)
    ).toBeInTheDocument();
    // Basic mode input should not be visible
    expect(screen.queryByPlaceholderText("e.g., 2")).not.toBeInTheDocument();
  });

  it("shows error when basic search is submitted without userId", async () => {
    render(<RecruiterSearchBox />);

    // Switch to basic mode first
    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    expect(screen.getByText("Please enter a candidate ID")).toBeInTheDocument();
  });

  it("shows error when premium search is submitted without skills or location", async () => {
    render(<RecruiterSearchBox />);

    // Switch to premium mode
    const premiumButton = screen.getByText("Premium Filters");
    await userEvent.click(premiumButton);

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    expect(
      screen.getByText("Please enter skills or location")
    ).toBeInTheDocument();
  });

  it("submits basic search successfully", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            resumeId: "resume-1",
            title: "Software Engineer Resume",
            userName: "John Doe",
            userId: "user-123",
            skills: ["React", "Node.js"],
            location: "New York",
            createdAt: "2024-01-15T10:00:00Z",
          },
        ],
        notification: null,
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    render(<RecruiterSearchBox />);

    // Switch to basic mode first
    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    const userIdInput = screen.getByPlaceholderText("e.g., 2");
    await userEvent.type(userIdInput, "user-123");

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/recruiter/search-resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-token",
        },
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          userId: "user-123",
        }),
      });
    });

    expect(mockGetIdToken).toHaveBeenCalled();
    expect(screen.getByText("1 resume found")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer Resume")).toBeInTheDocument();
  });

  it("submits premium search with skills successfully", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            resumeId: "resume-2",
            title: "Frontend Developer Resume",
            userName: "Jane Smith",
            userId: "user-456",
            skills: ["React", "TypeScript"],
            location: "San Francisco",
            createdAt: "2024-01-16T10:00:00Z",
          },
        ],
        notification: null,
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    render(<RecruiterSearchBox />);

    // Switch to premium mode
    const premiumButton = screen.getByText("Premium Filters");
    await userEvent.click(premiumButton);

    // Add skills
    const skillInput = screen.getByPlaceholderText("e.g., React, Python, AWS");
    await userEvent.type(skillInput, "React{enter}");

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/recruiter/search-resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-token",
        },
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          skills: ["React"],
        }),
      });
    });

    expect(screen.getByText("1 resume found")).toBeInTheDocument();
    expect(screen.getByText("Frontend Developer Resume")).toBeInTheDocument();
  });

  it("submits premium search with location successfully", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            resumeId: "resume-3",
            title: "Full Stack Developer Resume",
            userName: "Bob Johnson",
            userId: "user-789",
            skills: ["JavaScript", "Python"],
            location: "Austin",
            createdAt: "2024-01-17T10:00:00Z",
          },
        ],
        notification: null,
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    render(<RecruiterSearchBox />);

    // Switch to premium mode
    const premiumButton = screen.getByText("Premium Filters");
    await userEvent.click(premiumButton);

    // Add location
    const locationInput = screen.getByPlaceholderText(
      "City, region, or remote"
    );
    await userEvent.type(locationInput, "Austin");

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/recruiter/search-resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer mock-token",
        },
        body: JSON.stringify({
          recruiterId: "recruiter-123",
          location: "Austin",
        }),
      });
    });

    expect(screen.getByText("1 resume found")).toBeInTheDocument();
    expect(screen.getByText("Full Stack Developer Resume")).toBeInTheDocument();
  });

  it("handles search error", async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ error: "Search failed" }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    render(<RecruiterSearchBox />);

    // Switch to basic mode first
    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    const userIdInput = screen.getByPlaceholderText("e.g., 2");
    await userEvent.type(userIdInput, "user-123");

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Search failed")).toBeInTheDocument();
    });
  });

  it("shows notification when no results found", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [],
        notification: "No resumes found matching your search",
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    render(<RecruiterSearchBox />);

    // Switch to basic mode first
    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    const userIdInput = screen.getByPlaceholderText("e.g., 2");
    await userEvent.type(userIdInput, "user-999");

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("No resumes found matching your search")
      ).toBeInTheDocument();
    });
  });

  it("opens resume in new tab when view button is clicked", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        results: [
          {
            resumeId: "resume-1",
            title: "Software Engineer Resume",
            userName: "John Doe",
            userId: "user-123",
            skills: ["React", "Node.js"],
            location: "New York",
            createdAt: "2024-01-15T10:00:00Z",
            accessStatus: "approved",
          },
        ],
        notification: null,
      }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, "open", {
      writable: true,
      value: mockOpen,
    });

    render(<RecruiterSearchBox />);

    // Switch to basic mode first
    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    const userIdInput = screen.getByPlaceholderText("e.g., 2");
    await userEvent.type(userIdInput, "user-123");

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("View Full Resume")).toBeInTheDocument();
    });

    const viewButton = screen.getByText("View Full Resume");
    await userEvent.click(viewButton);

    expect(mockOpen).toHaveBeenCalledWith("/resumes/resume-1", "_blank");
  });

  it("disables form during loading", async () => {
    // Mock a slow response
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ results: [], notification: null }),
              }),
            100
          )
        )
    );

    render(<RecruiterSearchBox />);

    // Switch to basic mode first
    const basicButton = screen.getByText("Basic Lookup");
    await userEvent.click(basicButton);

    const userIdInput = screen.getByPlaceholderText("e.g., 2");
    await userEvent.type(userIdInput, "user-123");

    const submitButton = screen.getByText("Run Search");
    await userEvent.click(submitButton);

    // Button should show loading state
    expect(screen.getByText("Searching...")).toBeInTheDocument();

    // Input should be disabled
    expect(userIdInput).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText("Searching...")).not.toBeInTheDocument();
    });
  });
});
