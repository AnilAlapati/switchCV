import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPage } from "@/components/settings/NotificationAndAuditUI";

// Mock child components
jest.mock("@/components/settings/NotificationSettings", () => ({
  NotificationSettings: () => (
    <div data-testid="notification-settings">
      Notification Settings Component
    </div>
  ),
}));

jest.mock("@/components/settings/AuditLogViewer", () => ({
  AuditLogViewer: () => (
    <div data-testid="audit-log-viewer">Audit Log Viewer Component</div>
  ),
}));

describe("SettingsPage", () => {
  it("renders notifications tab by default", () => {
    render(<SettingsPage />);

    expect(screen.getByText("Notifications")).toHaveClass("border-blue-600");
    expect(screen.getByText("Activity & Privacy")).not.toHaveClass(
      "border-blue-600"
    );

    expect(screen.getByTestId("notification-settings")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-log-viewer")).not.toBeInTheDocument();
  });

  it("switches to audit tab when clicked", () => {
    render(<SettingsPage />);

    const auditTab = screen.getByText("Activity & Privacy");
    fireEvent.click(auditTab);

    expect(screen.getByText("Activity & Privacy")).toHaveClass(
      "border-blue-600"
    );
    expect(screen.getByText("Notifications")).not.toHaveClass(
      "border-blue-600"
    );

    expect(screen.getByTestId("audit-log-viewer")).toBeInTheDocument();
    expect(
      screen.queryByTestId("notification-settings")
    ).not.toBeInTheDocument();
  });

  it("switches back to notifications tab", () => {
    render(<SettingsPage />);

    // Switch to audit
    fireEvent.click(screen.getByText("Activity & Privacy"));
    expect(screen.getByTestId("audit-log-viewer")).toBeInTheDocument();

    // Switch back to notifications
    fireEvent.click(screen.getByText("Notifications"));

    expect(screen.getByText("Notifications")).toHaveClass("border-blue-600");
    expect(screen.getByTestId("notification-settings")).toBeInTheDocument();
    expect(screen.queryByTestId("audit-log-viewer")).not.toBeInTheDocument();
  });
});
