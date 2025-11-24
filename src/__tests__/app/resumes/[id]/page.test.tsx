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

    (templateService.getTemplateById as jest.Mock).mockResolvedValue({
      id: "standard-v1",
      name: "Standard",
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "resume123",
        templateId: "standard-v1",
        isPublic: true,
        viewerAccess: { isOwner: true, scope: "owner" },
      }),
    });
  });

  it("renders loading state initially", () => {
    (useAuth as jest.Mock).mockReturnValue({
      loading: true,
    });
    render(<ResumeView />);
    expect(screen.getByText("Checking authentication...")).toBeInTheDocument();
  });

  it("renders resume when fetched successfully", async () => {
    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByTestId("template-renderer")).toBeInTheDocument();
    });
  });

  it("renders access block on 401", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByTestId("access-block")).toHaveTextContent(
        "This resume is private"
      );
    });
  });

  it("renders access block on 403", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn().mockResolvedValue({}),
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(screen.getByTestId("access-block")).toHaveTextContent(
        "You do not have permission to view this resume"
      );
    });
  });

  it("renders error on 404", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
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

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: "resume123",
        templateId: "standard-v1",
        viewerAccess: { isOwner: true },
        deletionScheduledAt: futureDate.toISOString(),
        countdownStartsAt: new Date().toISOString(),
      }),
    });

    render(<ResumeView />);

    await waitFor(() => {
      expect(
        screen.getByText(/Resume scheduled for deletion/)
      ).toBeInTheDocument();
    });
  });
});
