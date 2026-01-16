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

// Mock useResumeData hook
jest.mock("@/hooks/useResumeData", () => ({
  useResumeData: jest.fn(),
}));

import { useResumeData } from "@/hooks/useResumeData";

describe("ResumeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it("should show loading state initially", () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (useResumeData as jest.Mock).mockReturnValue({
      resume: null,
      template: null,
      accessBlock: null,
      error: null,
      loading: true,
      mutateResume: jest.fn(),
    });

    render(<ResumeView />);
    // Should show skeleton loader
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should show resume not found if API returns 404", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (useResumeData as jest.Mock).mockReturnValue({
      resume: null,
      template: null,
      accessBlock: null,
      error: "Resume not found",
      loading: false,
      mutateResume: jest.fn(),
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
      isPublic: false,
      viewerAccess: { isOwner: true, scope: "owner" },
    };
    (useResumeData as jest.Mock).mockReturnValue({
      resume: mockResume,
      template: { id: "masonry-v1", name: "Masonry" },
      accessBlock: null,
      error: null,
      loading: false,
      mutateResume: jest.fn(),
    });

    const { container } = render(<ResumeView />);

    await waitFor(() => {
      // Verify the component renders without error and shows the privacy toggle
      expect(container.textContent).toContain("Private");
    });
  });

  it("should handle errors", async () => {
    (useParams as jest.Mock).mockReturnValue({ id: "123" });
    (useResumeData as jest.Mock).mockReturnValue({
      resume: null,
      template: null,
      accessBlock: null,
      error: "Fetch error",
      loading: false,
      mutateResume: jest.fn(),
    });

    const { container } = render(<ResumeView />);

    await waitFor(() => {
      // Component shows error message
      expect(container.textContent).toContain("Fetch error");
    });
  });
});
