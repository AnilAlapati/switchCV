import { render, screen, waitFor } from "@testing-library/react";
import ResumeView from "@/app/resumes/[id]/page";
import { useParams } from "next/navigation";

// Mock fetch globally
global.fetch = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
  db: {},
}));

jest.mock("@/lib/services/templateService", () => ({
  templateService: {
    getTemplateById: jest.fn().mockResolvedValue({
      id: "standard-v1",
      name: "Standard",
    }),
  },
}));

jest.mock("@/components/resume/TemplateRenderer", () => ({
  TemplateRenderer: () => null,
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      uid: "test-user",
      email: "test@example.com",
      getIdToken: jest.fn().mockResolvedValue("test-token"),
    },
    loading: false,
  }),
}));

describe("ResumeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it("should show loading state initially", () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    // Mock fetch to never resolve to test loading state
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<ResumeView />);
    expect(screen.getByText("Loading resume...")).toBeInTheDocument();
  });

  it("should show resume not found if API returns 404", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByText(/Resume not found/i)).toBeInTheDocument();
    });
  });

  it("should render resume data when found", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    const mockResume = {
      title: "My Resume",
      numericId: 1001,
      updatedAt: new Date().toISOString(),
      summary: "My summary",
      skills: ["React", "Node"],
      personalInfo: {
        name: "John Doe",
        email: "john@example.com",
      },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockResume),
    });

    const { container } = render(<ResumeView />);

    await waitFor(() => {
      // Verify fetch was called with the resume ID
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/resumes/123"),
        expect.any(Object)
      );
      // Verify the component renders without error and shows the privacy toggle
      expect(container.textContent).toContain("Private");
    });
  });

  it("should handle errors", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Fetch error"));

    const { container } = render(<ResumeView />);

    await waitFor(() => {
      // Component shows error message in the error display
      const errorText = container.textContent;
      expect(errorText).toContain("Fetch error");
    });
  });
});
