import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DraftPreview from "@/app/drafts/[draftId]/page";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import { templateService } from "@/lib/services/templateService";
import { useDraftData } from "@/hooks/useDraftData";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useDraftData", () => ({
  useDraftData: jest.fn(),
}));

jest.mock("@/lib/services/templateService", () => ({
  templateService: {
    getTemplateById: jest.fn(),
  },
}));

jest.mock("@/components/resume/TemplateRenderer", () => ({
  TemplateRenderer: () => (
    <div data-testid="template-renderer">Template Renderer</div>
  ),
}));

jest.mock("@/components/resume/LegacyResumeRenderer", () => ({
  LegacyResumeRenderer: () => (
    <div data-testid="legacy-renderer">Legacy Renderer</div>
  ),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("DraftPreview Page", () => {
  const mockRouter = { push: jest.fn() };
  const mockUser = { getIdToken: jest.fn().mockResolvedValue("mock-token") };
  const mockDraftId = "draft-123";

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ draftId: mockDraftId });
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser, loading: false });
    (useDraftData as jest.Mock).mockReturnValue({
      draft: null,
      loading: true,
      error: null,
    });
    global.fetch = jest.fn();
  });

  it("should show loading state when auth is loading", () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: true });
    render(<DraftPreview />);
    expect(screen.getByText("Loading preview...")).toBeInTheDocument();
  });

  it("should redirect to login if user is not authenticated", async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null, loading: false });
    render(<DraftPreview />);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/auth?redirect=/drafts/${mockDraftId}`
      );
    });
  });

  it("should show loading state when fetching draft", () => {
    (useDraftData as jest.Mock).mockReturnValue({
      draft: null,
      loading: true,
      error: null,
    });
    render(<DraftPreview />);
    expect(screen.getByText("Loading preview...")).toBeInTheDocument();
  });

  it("should show error if draft not found", async () => {
    (useDraftData as jest.Mock).mockReturnValue({
      draft: null,
      loading: false,
      error: "Draft not found",
    });

    render(<DraftPreview />);

    await waitFor(() => {
      expect(screen.getByText("Draft not found")).toBeInTheDocument();
    });
  });

  it("should render draft with template on success", async () => {
    const mockDraft = {
      draftId: mockDraftId,
      userId: "user-123",
      profile: { templateId: "modern-v1", name: "Test User" },
      updatedAt: new Date().toISOString(),
    };

    (useDraftData as jest.Mock).mockReturnValue({
      draft: mockDraft,
      loading: false,
      error: null,
    });

    (templateService.getTemplateById as jest.Mock).mockResolvedValue({
      id: "modern-v1",
      name: "Modern",
    });

    render(<DraftPreview />);

    await waitFor(() => {
      expect(screen.getByTestId("template-renderer")).toBeInTheDocument();
    });
    expect(screen.getByText("Draft Preview")).toBeInTheDocument();
  });

  it("should handle publish success", async () => {
    const mockDraft = {
      draftId: mockDraftId,
      userId: "user-123",
      profile: { templateId: "modern-v1" },
      updatedAt: new Date().toISOString(),
    };

    (useDraftData as jest.Mock).mockReturnValue({
      draft: mockDraft,
      loading: false,
      error: null,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ resumeId: "resume-789" }),
    });

    (templateService.getTemplateById as jest.Mock).mockResolvedValue({
      id: "modern-v1",
    });

    render(<DraftPreview />);

    await waitFor(() => {
      expect(screen.getByText("Draft Preview")).toBeInTheDocument();
      expect(screen.getByText("Publish Now")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Publish Now"));

    await waitFor(() => {
      expect(screen.getByText("Publishing...")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/resumes/resume-789");
    });
  });

  it("should handle publish error", async () => {
    const mockDraft = {
      draftId: mockDraftId,
      userId: "user-123",
      profile: { templateId: "modern-v1" },
      updatedAt: new Date().toISOString(),
    };

    (useDraftData as jest.Mock).mockReturnValue({
      draft: mockDraft,
      loading: false,
      error: null,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Publish failed" }),
    });

    (templateService.getTemplateById as jest.Mock).mockResolvedValue({
      id: "modern-v1",
    });

    render(<DraftPreview />);

    await waitFor(() => {
      expect(screen.getByText("Draft Preview")).toBeInTheDocument();
      expect(screen.getByText("Publish Now")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Publish Now"));

    await waitFor(() => {
      expect(screen.getByText("Publish failed")).toBeInTheDocument();
    });
  });

  it("should handle edit navigation", async () => {
    const mockDraft = {
      draftId: mockDraftId,
      userId: "user-123",
      profile: { templateId: "modern-v1" },
      updatedAt: new Date().toISOString(),
    };

    (useDraftData as jest.Mock).mockReturnValue({
      draft: mockDraft,
      loading: false,
      error: null,
    });

    (templateService.getTemplateById as jest.Mock).mockResolvedValue({
      id: "modern-v1",
    });

    render(<DraftPreview />);

    await waitFor(
      () => {
        expect(screen.getByText("Edit")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    fireEvent.click(screen.getByText("Edit"));

    expect(mockRouter.push).toHaveBeenCalledWith(
      `/create-resume?draft=${mockDraftId}`
    );
  });
});
