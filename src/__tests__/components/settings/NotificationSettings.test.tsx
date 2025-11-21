import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { useNotificationPreferences } from "@/hooks/useAuditLog";

// Mock the hook
jest.mock("@/hooks/useAuditLog");

describe("NotificationSettings", () => {
  const mockGetPreferences = jest.fn();
  const mockUpdatePreferences = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotificationPreferences as jest.Mock).mockReturnValue({
      getPreferences: mockGetPreferences,
      updatePreferences: mockUpdatePreferences,
    });
  });

  it("renders loading state initially", async () => {
    // Make getPreferences hang to test loading state
    mockGetPreferences.mockImplementation(() => new Promise(() => {}));
    render(<NotificationSettings />);
    expect(screen.getByText("Loading notification settings...")).toBeInTheDocument();
  });

  it("renders notification options after loading", async () => {
    mockGetPreferences.mockResolvedValue({
      recruiterRequests: true,
      profileViews: false,
      weeklyDigest: true,
      adminAlerts: false,
    });

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.queryByText("Loading notification settings...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Notification Preferences")).toBeInTheDocument();
    expect(screen.getByText("Recruiter Requests")).toBeInTheDocument();
    expect(screen.getByText("Profile Views")).toBeInTheDocument();
  });

  it("loads default preferences if getPreferences returns null", async () => {
    mockGetPreferences.mockResolvedValue(null);

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.queryByText("Loading notification settings...")).not.toBeInTheDocument();
    });

    // Check if all toggles are enabled (default state)
    const toggles = screen.getAllByRole("button");
    toggles.forEach((toggle) => {
      expect(toggle).toHaveClass("bg-blue-600");
    });
  });

  it("handles error when loading preferences fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetPreferences.mockRejectedValue(new Error("Failed to fetch"));

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load notification preferences")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("toggles notification preference and calls updatePreferences", async () => {
    mockGetPreferences.mockResolvedValue({
      recruiterRequests: true,
      profileViews: true,
      weeklyDigest: true,
      adminAlerts: true,
    });
    mockUpdatePreferences.mockResolvedValue(undefined);

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.queryByText("Loading notification settings...")).not.toBeInTheDocument();
    });

    const toggles = screen.getAllByRole("button");
    fireEvent.click(toggles[0]); // Toggle Recruiter Requests

    expect(mockUpdatePreferences).toHaveBeenCalledWith({ recruiterRequests: false });
    
    await waitFor(() => {
      expect(screen.getByText("✓ Settings saved successfully")).toBeInTheDocument();
    });
  });

  it("handles error when updating preferences fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetPreferences.mockResolvedValue({
      recruiterRequests: true,
      profileViews: true,
      weeklyDigest: true,
      adminAlerts: true,
    });
    mockUpdatePreferences.mockRejectedValue(new Error("Update failed"));

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.queryByText("Loading notification settings...")).not.toBeInTheDocument();
    });

    const toggles = screen.getAllByRole("button");
    fireEvent.click(toggles[0]); // Toggle Recruiter Requests

    await waitFor(() => {
      expect(screen.getByText("✗ Failed to save settings")).toBeInTheDocument();
    });

    // Should revert the toggle visually (though in the component logic it sets state then reverts on error)
    // Since we can't easily check the intermediate state, we check the final state or the error message.
    
    consoleSpy.mockRestore();
  });

  it("disables toggles while saving", async () => {
    mockGetPreferences.mockResolvedValue({
      recruiterRequests: true,
      profileViews: true,
      weeklyDigest: true,
      adminAlerts: true,
    });
    // Make update hang to test disabled state
    mockUpdatePreferences.mockImplementation(() => new Promise(() => {}));

    render(<NotificationSettings />);

    await waitFor(() => {
      expect(screen.queryByText("Loading notification settings...")).not.toBeInTheDocument();
    });

    const toggles = screen.getAllByRole("button");
    fireEvent.click(toggles[0]);

    // All toggles should be disabled while saving
    toggles.forEach((toggle) => {
      expect(toggle).toBeDisabled();
    });
  });
});
