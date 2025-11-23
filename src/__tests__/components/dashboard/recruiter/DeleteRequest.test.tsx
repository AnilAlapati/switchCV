import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecruiterRequestsPage from "@/app/dashboard/recruiter/requests/page";
import { useAuth } from "@/hooks/useAuth";

// Mock useAuth
jest.mock("@/hooks/useAuth");

// Mock DashboardHeader to avoid notification fetch issues
jest.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: () => <div data-testid="dashboard-header">Header</div>,
}));

// Mock fetch
global.fetch = jest.fn();

// Mock alert
global.alert = jest.fn();

describe("RecruiterRequestsPage - Delete Functionality", () => {
  const mockUser = {
    email: "recruiter@example.com",
    getIdToken: jest.fn().mockResolvedValue("mock-token"),
  };

  const mockRequests = [
    {
      id: "req-1",
      candidateName: "John Doe",
      resumeTitle: "Frontend Dev",
      resumeId: "resume-1",
      message: "Hi",
      timestamp: new Date().toISOString(),
      status: "pending",
    },
  ];

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
    });
    (global.fetch as jest.Mock).mockClear();
    (global.alert as jest.Mock).mockClear();
  });

  it("should delete a request when confirmed via dialog", async () => {
    // Mock initial fetch requests
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests: mockRequests }),
      })
      // Mock delete request
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(<RecruiterRequestsPage />);

    // Wait for requests to load
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Find delete button and click it
    const deleteButton = screen.getByTitle("Delete Request");
    fireEvent.click(deleteButton);

    // Check if dialog appears
    expect(screen.getByText("Delete Request?")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to delete/)
    ).toBeInTheDocument();

    // Click Delete in dialog
    const confirmButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmButton);

    // Check if delete API was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/api/recruiter/requests?requestId=req-1&resumeId=resume-1"
        ),
        expect.objectContaining({
          method: "DELETE",
          headers: {
            Authorization: "Bearer mock-token",
          },
        })
      );
    });

    // Check if request is removed from UI
    await waitFor(() => {
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });
  });

  it("should not delete a request when cancelled via dialog", async () => {
    // Mock initial fetch requests
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requests: mockRequests }),
    });

    render(<RecruiterRequestsPage />);

    // Wait for requests to load
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    // Find delete button and click it
    const deleteButton = screen.getByTitle("Delete Request");
    fireEvent.click(deleteButton);

    // Check if dialog appears
    expect(screen.getByText("Delete Request?")).toBeInTheDocument();

    // Click Cancel in dialog
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    // Check if dialog disappears
    await waitFor(() => {
      expect(screen.queryByText("Delete Request?")).not.toBeInTheDocument();
    });

    // Check if delete API was NOT called
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only initial fetch

    // Check if request is still in UI
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});
