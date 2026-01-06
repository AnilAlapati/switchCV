import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ResumeView from "@/app/resumes/[id]/page";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "next/navigation";
import { templateService } from "@/lib/services/templateService";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock("@/lib/services/templateService");

jest.mock("@/hooks/useResumeData", () => ({
  useResumeData: jest.fn(),
}));

import { useResumeData } from "@/hooks/useResumeData";

// Mock components
jest.mock("@/components/resume/TemplateRenderer", () => ({
  TemplateRenderer: () => <div data-testid="template-renderer" />,
}));
jest.mock("@/components/resume/LegacyResumeRenderer", () => ({
  LegacyResumeRenderer: () => <div data-testid="legacy-renderer" />,
}));
jest.mock("@/components/resume/ResumeAccessBlock", () => ({
  ResumeAccessBlock: ({ config }: any) => (
    <div data-testid="access-block">{config.title}</div>
  ),
}));
jest.mock("@/components/resume/ResumeToastOverlay", () => ({
  ResumeToastOverlay: () => <div data-testid="toast-overlay" />,
}));
jest.mock("@/components/resume/PrivacyMenu", () => ({
  PrivacyMenu: ({ onToggleVisibility }: any) => (
    <button onClick={onToggleVisibility}>Toggle Visibility</button>
  ),
}));
jest.mock("@/components/RequestAccessDialog", () => ({
  RequestAccessDialog: () => <div data-testid="request-dialog" />,
}));

// Mock fetch
global.fetch = jest.fn();

describe("ResumeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useParams as jest.Mock).mockReturnValue({ id: "resume123" });

    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: "user123",
        getIdToken: jest.fn().mockResolvedValue("token"),
      },
      loading: false,
    });

    (useResumeData as jest.Mock).mockReturnValue({
      resume: {
        id: "resume123",
        templateId: "standard-v1",
        isPublic: true,
        viewerAccess: { isOwner: true, scope: "owner" },
      },
      template: {
        id: "standard-v1",
        name: "Standard",
      },
      accessBlock: null,
      error: null,
      loading: false,
      mutateResume: jest.fn(),
    });
  });

  it("renders loading state initially", () => {
    (useResumeData as jest.Mock).mockReturnValue({
      resume: null,
      template: null,
      accessBlock: null,
      error: null,
      loading: true,
    });
    const { container } = render(<ResumeView />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders resume when fetched successfully", async () => {
    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByTestId("template-renderer")).toBeInTheDocument();
    });
  });

  it("renders access block on 401/403", async () => {
    (useResumeData as jest.Mock).mockReturnValue({
      resume: null,
      template: null,
      accessBlock: {
        title: "This resume is private",
        description: "The owner has restricted access.",
      },
      error: null,
      loading: false,
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByTestId("access-block")).toHaveTextContent(
        "This resume is private"
      );
    });
  });

  it("renders error state", async () => {
    (useResumeData as jest.Mock).mockReturnValue({
      resume: null,
      template: null,
      accessBlock: null,
      error: "Resume not found",
      loading: false,
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByText("Error: Resume not found")).toBeInTheDocument();
    });
  });

  it("toggles visibility", async () => {
    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByTestId("template-renderer")).toBeInTheDocument();
    });

    // Mock successful patch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    });

    fireEvent.click(screen.getByText("Toggle Visibility"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/resumes/resume123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ isPublic: false }), // Toggles from true to false
        })
      );
    });
  });

  it("shows deletion countdown banner for owner", async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    (useResumeData as jest.Mock).mockReturnValue({
      resume: {
        id: "resume123",
        templateId: "standard-v1",
        viewerAccess: { isOwner: true },
        deletionScheduledAt: futureDate.toISOString(),
        countdownStartsAt: new Date().toISOString(),
      },
      template: { id: "standard-v1" },
      accessBlock: null,
      error: null,
      loading: false,
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(
        screen.getByText(/Resume scheduled for deletion/)
      ).toBeInTheDocument();
    });
  });
});
