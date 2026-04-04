import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { ResumeStatusCard } from "@/components/dashboard/ResumeStatusCard";
import { useAuth } from "@/hooks/useAuth";
import { reloadPage } from "@/lib/utils/navigation";
import { toast } from "sonner";

// Mock dependencies
jest.mock("@/hooks/useAuth");
jest.mock("@/lib/utils/navigation", () => ({
  reloadPage: jest.fn(),
}));
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});
jest.mock("@/lib/config", () => ({
  getResumeUrl: (id: string) => `http://example.com/resume/${id}`,
}));
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe("ResumeStatusCard", () => {
  const mockUser = {
    uid: "user-123",
    getIdToken: jest.fn().mockResolvedValue("mock-token"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    // Mock global fetch
    global.fetch = jest.fn();
  });

  it("renders loading state", async () => {
    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={false}
          resumeId={null}
          resumeLoading={true}
        />,
      );
    });
    expect(screen.getAllByText("Loading...")[0]).toBeInTheDocument();
  });

  it("renders 'Not Created' state", async () => {
    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={false}
          resumeId={null}
          resumeLoading={false}
        />,
      );
    });
    expect(screen.getAllByText("Not Created")[0]).toBeInTheDocument();
    expect(screen.getByText("Create Resume")).toBeInTheDocument();
  });

  it("renders 'Created' state with View and Delete buttons", async () => {
    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={true}
          resumeId="resume-123"
          resumeLoading={false}
        />,
      );
    });
    expect(screen.getAllByText("Private Draft")[0]).toBeInTheDocument();
    expect(screen.getByText("View Resume")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("opens delete confirmation modal when Delete is clicked", async () => {
    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={true}
          resumeId="resume-123"
          resumeLoading={false}
        />,
      );
    });
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Warning: Permanent Action")).toBeInTheDocument();
    expect(
      screen.getByText(
        "If you delete this resume, you will lose all its data permanently.",
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument();
  });

  it("cancels delete when Cancel is clicked", async () => {
    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={true}
          resumeId="resume-123"
          resumeLoading={false}
        />,
      );
    });
    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(
      screen.queryByText("Warning: Permanent Action"),
    ).not.toBeInTheDocument();
  });

  it("handles delete resume successfully", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId="resume-123"
        resumeLoading={false}
      />,
    );

    fireEvent.click(screen.getByText("Delete"));
    // Click the confirm delete button (the one inside the modal)
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    const confirmDeleteButton = deleteButtons.find((b) =>
      b.className.includes("bg-red-600"),
    );
    fireEvent.click(confirmDeleteButton!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/resumes/resume-123",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    await waitFor(() => {
      expect(reloadPage).toHaveBeenCalled();
    });
  });

  it("handles delete resume failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Delete failed" }),
    });

    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={true}
          resumeId="resume-123"
          resumeLoading={false}
        />,
      );
    });

    fireEvent.click(screen.getByText("Delete"));
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    const confirmDeleteButton = deleteButtons.find((b) =>
      b.className.includes("bg-red-600"),
    );
    fireEvent.click(confirmDeleteButton!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to delete resume. Please try again.",
      );
    });
  });

  it("alerts when user is not logged in during delete", async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={true}
          resumeId="resume-123"
          resumeLoading={false}
        />,
      );
    });

    // Note: The component checks user login inside handleDeleteResume,
    // but the button is only visible if hasResume is true.
    // We need to trigger the delete flow.
    fireEvent.click(screen.getByText("Delete"));
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    const confirmDeleteButton = deleteButtons.find((b) =>
      b.className.includes("bg-red-600"),
    );
    fireEvent.click(confirmDeleteButton!);

    expect(toast.error).toHaveBeenCalledWith(
      "You must be logged in to delete your resume.",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("alerts when resumeId is missing during delete", async () => {
    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={true}
          resumeId={null}
          resumeLoading={false}
        />,
      );
    });

    fireEvent.click(screen.getByText("Delete"));
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    const confirmDeleteButton = deleteButtons.find((b) =>
      b.className.includes("bg-red-600"),
    );
    fireEvent.click(confirmDeleteButton!);

    expect(toast.error).toHaveBeenCalledWith(
      "Resume ID not found. Please refresh the page and try again.",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("disables edit button when resumeId is missing", async () => {
    await act(async () => {
      render(
        <ResumeStatusCard
          hasResume={true}
          resumeId={null}
          resumeLoading={false}
        />,
      );
    });

    const editButton = screen.getByText("Edit");
    expect(editButton.tagName).toBe("BUTTON");
    expect(editButton).toBeDisabled();
  });
});
