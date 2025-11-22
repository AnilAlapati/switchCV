import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResumeStatusCard } from "@/components/dashboard/ResumeStatusCard";
import { useAuth } from "@/hooks/useAuth";
import { reloadPage } from "@/lib/utils/navigation";

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
    // Mock alert
    global.alert = jest.fn();
  });

  it("renders loading state", () => {
    render(
      <ResumeStatusCard
        hasResume={false}
        resumeId={null}
        resumeLoading={true}
      />
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders 'Not Created' state", () => {
    render(
      <ResumeStatusCard
        hasResume={false}
        resumeId={null}
        resumeLoading={false}
      />
    );
    expect(screen.getByText("Not Created")).toBeInTheDocument();
    expect(screen.getByText("Create Resume")).toBeInTheDocument();
  });

  it("renders 'Created' state with View and Delete buttons", () => {
    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId="resume-123"
        resumeLoading={false}
      />
    );
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("View Resume")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("opens delete confirmation modal when Delete is clicked", () => {
    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId="resume-123"
        resumeLoading={false}
      />
    );
    fireEvent.click(screen.getByText("Delete"));
    expect(screen.getByText("Delete Resume?")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete your resume?", {
        exact: false,
      })
    ).toBeInTheDocument();
  });

  it("cancels delete when Cancel is clicked", () => {
    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId="resume-123"
        resumeLoading={false}
      />
    );
    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Delete Resume?")).not.toBeInTheDocument();
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
      />
    );

    fireEvent.click(screen.getByText("Delete"));
    // Click the confirm delete button (the one inside the modal)
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[1]); // The second one is in the modal

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/resume/delete",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ resumeId: "resume-123" }),
        })
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

    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId="resume-123"
        resumeLoading={false}
      />
    );

    fireEvent.click(screen.getByText("Delete"));
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[1]);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Error deleting resume: Delete failed"
      );
    });
  });

  it("alerts if user is not logged in when deleting", async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });

    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId="resume-123"
        resumeLoading={false}
      />
    );

    // Note: The component checks user login inside handleDeleteResume,
    // but the button is only visible if hasResume is true.
    // We need to trigger the delete flow.
    fireEvent.click(screen.getByText("Delete"));
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[1]);

    expect(global.alert).toHaveBeenCalledWith(
      "You must be logged in to delete your resume."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("alerts if resumeId is missing when deleting", async () => {
    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId={null}
        resumeLoading={false}
      />
    );

    fireEvent.click(screen.getByText("Delete"));
    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[1]);

    expect(global.alert).toHaveBeenCalledWith(
      "Resume ID not found. Please refresh the page and try again."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("disables edit button when resumeId is missing", () => {
    render(
      <ResumeStatusCard
        hasResume={true}
        resumeId={null}
        resumeLoading={false}
      />
    );

    const editButton = screen.getByText("Edit");
    expect(editButton.tagName).toBe("BUTTON");
    expect(editButton).toBeDisabled();
  });
});
