import React from "react";
import { render, screen, waitFor } from "../__support__/testUtils";
import { AuditLogViewer } from "@/components/settings/AuditLogViewer";

jest.mock("@/hooks/useAuditLog", () => ({
  usePersonalAuditLogs: () => ({
    getMyAuditLogs: jest.fn(async () => [
      { id: "1", action: "Login", timestamp: new Date() },
    ]),
    exportMyData: jest.fn(async () => ({ data: "export" })),
  }),
}));

describe("AuditLogViewer", () => {
  it("renders activity log title", async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByText("Activity Log")).toBeInTheDocument();
    });
  });

  it("renders description text", async () => {
    render(<AuditLogViewer />);

    await waitFor(() => {
      expect(
        screen.getByText(/View your account activity/)
      ).toBeInTheDocument();
    });
  });
});
