import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";
import { usePersonalAuditLogs } from "@/hooks/useAuditLog";
import { toast } from "sonner";

// Mock the hook
jest.mock("@/hooks/useAuditLog");
jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

describe("AuditLogViewer", () => {
  const mockGetMyAuditLogs = jest.fn();
  const mockExportMyData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePersonalAuditLogs as jest.Mock).mockReturnValue({
      getMyAuditLogs: mockGetMyAuditLogs,
      exportMyData: mockExportMyData,
    });
  });

  it("renders loading state initially", async () => {
    mockGetMyAuditLogs.mockImplementation(() => new Promise(() => {}));
    render(<AuditLogViewer />);
    expect(screen.getByText("Loading activity log...")).toBeInTheDocument();
  });

  it("renders empty state when no logs are returned", async () => {
    mockGetMyAuditLogs.mockResolvedValue([]);
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText("No activity recorded yet")).toBeInTheDocument();
  });

  it("renders logs table when logs are returned", async () => {
    const mockLogs = [
      {
        id: "1",
        timestamp: new Date("2023-01-01T12:00:00Z"),
        action: "LOGIN",
        resourceType: "AUTH",
        details: "User logged in",
        status: "success",
      },
    ];
    mockGetMyAuditLogs.mockResolvedValue(mockLogs);

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText("Activity Log")).toBeInTheDocument();
    expect(screen.getByText("LOGIN")).toBeInTheDocument();
    expect(screen.getByText("AUTH")).toBeInTheDocument();
    expect(screen.getByText("User logged in")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
  });

  it("handles error when loading logs fails", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockGetMyAuditLogs.mockRejectedValue(new Error("Failed to fetch"));

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    // Should show empty state or handle error gracefully (component currently just logs error and stops loading)
    // So we expect empty state or just the header
    expect(screen.getByText("Activity Log")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("calls exportMyData when export button is clicked", async () => {
    mockGetMyAuditLogs.mockResolvedValue([]);
    mockExportMyData.mockResolvedValue({ some: "data" });

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    const exportButton = screen.getByText("Download Data");
    fireEvent.click(exportButton);

    expect(mockExportMyData).toHaveBeenCalled();
  });

  it("handles export success", async () => {
    mockGetMyAuditLogs.mockResolvedValue([]);
    mockExportMyData.mockResolvedValue({ some: "data" });

    // Mock anchor click
    const clickSpy = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = jest
      .spyOn(document, "createElement")
      .mockImplementation((tagName, options) => {
        const element = originalCreateElement(tagName, options);
        if (tagName === "a") {
          jest.spyOn(element, "click").mockImplementation(clickSpy);
        }
        return element;
      });

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    const exportButton = screen.getByText("Download Data");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
  });

  it("handles export failure", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockGetMyAuditLogs.mockResolvedValue([]);
    mockExportMyData.mockRejectedValue(new Error("Export failed"));

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    const exportButton = screen.getByText("Download Data");
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to export your data. Please try again."
      );
    });

    consoleSpy.mockRestore();
  });

  it("disables export button while exporting", async () => {
    mockGetMyAuditLogs.mockResolvedValue([]);
    mockExportMyData.mockImplementation(() => new Promise(() => {})); // Hang

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    const exportButton = screen.getByText("Download Data");
    fireEvent.click(exportButton);

    expect(screen.getByText("Exporting...")).toBeDisabled();
  });

  it("renders logs with different statuses and timestamp formats", async () => {
    const mockLogs = [
      {
        // No ID, should use index
        timestamp: { toDate: () => new Date("2023-01-02T12:00:00Z") }, // Firestore timestamp
        action: "DELETE",
        resourceType: "RESUME",
        details: null, // No details
        status: "failure",
      },
    ];
    mockGetMyAuditLogs.mockResolvedValue(mockLogs);

    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.queryByText("Loading activity log...")
      ).not.toBeInTheDocument();
    });

    expect(screen.getByText("DELETE")).toBeInTheDocument();
    expect(screen.getByText("failure")).toBeInTheDocument();
    // Check for red badge class
    const statusBadge = screen.getByText("failure");
    expect(statusBadge).toHaveClass("bg-red-100");
    expect(statusBadge).toHaveClass("text-red-800");
  });
});
