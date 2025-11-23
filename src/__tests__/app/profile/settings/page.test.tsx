import React from "react";
import { render, waitFor, fireEvent } from "../../../__support__/testUtils";

// Mock hooks
const mockGetIdToken = jest.fn().mockResolvedValue("mock-id-token");
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      uid: "u1",
      email: "test@example.com",
      getIdToken: mockGetIdToken,
    },
    logout: jest.fn(),
    loading: false,
  }),
}));

jest.mock("@/hooks/useResume", () => ({
  useResume: () => ({ resumeId: "r1", hasResume: true }),
}));

// Mock child components to keep test focused
jest.mock("@/components/dashboard/DashboardBackground", () => ({
  DashboardBackground: ({ children }: any) => (
    <div data-testid="db-bg">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: ({ userEmail }: any) => (
    <div data-testid="db-header">{userEmail}</div>
  ),
}));

jest.mock("@/components/settings/AccountInformation", () => ({
  AccountInformation: ({ onRecruiterToggle }: any) => (
    <div data-testid="account-info">
      <button
        data-testid="toggle-recruiter"
        onClick={() => onRecruiterToggle(true)}
      >
        Toggle Recruiter
      </button>
    </div>
  ),
}));

jest.mock("@/components/settings/ProfileDetails", () => ({
  ProfileDetails: ({
    onDisplayNameChange,
    onCompanyNameChange,
    onSaveDisplayName,
    onSaveCompanyName,
    displayName,
    companyName,
  }: any) => (
    <div data-testid="profile-details">
      <input
        data-testid="display-name-input"
        value={displayName}
        onChange={(e) => onDisplayNameChange(e.target.value)}
      />
      <button data-testid="save-display-name" onClick={onSaveDisplayName}>
        Save Display Name
      </button>
      <input
        data-testid="company-name-input"
        value={companyName}
        onChange={(e) => onCompanyNameChange(e.target.value)}
      />
      <button data-testid="save-company-name" onClick={onSaveCompanyName}>
        Save Company Name
      </button>
    </div>
  ),
}));

jest.mock("@/components/settings/Notification", () => ({
  Notification: ({ text }: any) => <div data-testid="notification">{text}</div>,
}));

import SettingsPage from "@/app/profile/settings/page";

describe("SettingsPage (app/profile/settings)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("renders heading and child placeholders when user present", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        isRecruiter: false,
        displayName: "Test User",
        companyName: "Test Company",
      }),
    });

    const { getByText, getByTestId } = render((<SettingsPage />) as any);

    await waitFor(() => {
      expect(getByText("Settings & Profile")).toBeInTheDocument();
      expect(getByTestId("db-header")).toBeInTheDocument();
      expect(getByTestId("account-info")).toBeInTheDocument();
      expect(getByTestId("profile-details")).toBeInTheDocument();
    });
  });

  it("saves display name independently without overwriting company name", async () => {
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (
        url.includes("/api/user/settings") &&
        (!options || options.method === "GET")
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            isRecruiter: true,
            displayName: "Old Name",
            companyName: "Old Company",
          }),
        });
      }
      if (url.includes("/api/user/settings") && options?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.reject(
        new Error(`Unknown URL: ${url} Method: ${options?.method}`)
      );
    });

    const { getByTestId } = render((<SettingsPage />) as any);

    // Wait for initial load
    await waitFor(() => {
      expect(getByTestId("display-name-input")).toHaveValue("Old Name");
    });

    // Change display name
    fireEvent.change(getByTestId("display-name-input"), {
      target: { value: "New Name" },
    });

    // Save display name
    fireEvent.click(getByTestId("save-display-name"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/settings",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            userId: "u1",
            displayName: "New Name",
          }),
        })
      );
    });

    // Verify companyName was NOT sent
    const putCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/user/settings" && call[1].method === "PUT"
    );
    const body = JSON.parse(putCall[1].body);
    expect(body).toHaveProperty("displayName", "New Name");
    expect(body).not.toHaveProperty("companyName");
  });

  it("saves company name independently without overwriting display name", async () => {
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (
        url.includes("/api/user/settings") &&
        (!options || options.method === "GET")
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            isRecruiter: true,
            displayName: "Old Name",
            companyName: "Old Company",
          }),
        });
      }
      if (url.includes("/api/user/settings") && options?.method === "PUT") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.reject(
        new Error(`Unknown URL: ${url} Method: ${options?.method}`)
      );
    });

    const { getByTestId } = render((<SettingsPage />) as any);

    // Wait for initial load
    await waitFor(() => {
      expect(getByTestId("company-name-input")).toHaveValue("Old Company");
    });

    // Change company name
    fireEvent.change(getByTestId("company-name-input"), {
      target: { value: "New Company" },
    });

    // Save company name
    fireEvent.click(getByTestId("save-company-name"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/settings",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            userId: "u1",
            companyName: "New Company",
          }),
        })
      );
    });

    // Verify displayName was NOT sent
    const putCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) => call[0] === "/api/user/settings" && call[1].method === "PUT"
    );
    const body = JSON.parse(putCall[1].body);
    expect(body).toHaveProperty("companyName", "New Company");
    expect(body).not.toHaveProperty("displayName");
  });
});
