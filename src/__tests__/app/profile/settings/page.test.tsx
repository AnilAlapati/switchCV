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

// Mock useUserSettings hook with configurable values
// Variable names must be prefixed with "mock" for Jest to allow them
const mockMutateSettings = jest.fn();
const mockMutateProfile = jest.fn();

// Store the current settings value to be returned by the mock
const mockCreateSettings = (overrides = {}) => ({
  isRecruiter: false,
  displayName: "Test User",
  companyName: "Test Company",
  // Use a fixed past date instead of new Date().toISOString() to guarantee it
  // never accidentally matches the component's initial state initialization timestamp
  // (which happens in the same millisecond during fast test runs).
  updatedAt: "2020-01-01T00:00:00.000Z",
  ...overrides,
});

// Jest requires variables referenced in mock factories to start with 'mock'
let mockCurrentSettings = mockCreateSettings();

jest.mock("@/hooks/useUserSettings", () => ({
  useUserSettings: () => ({
    settings: mockCurrentSettings,
    loading: false,
    error: null,
    mutate: mockMutateSettings,
  }),
}));

jest.mock("@/hooks/useUserProfile", () => ({
  useUserProfile: () => ({
    mutate: mockMutateProfile,
  }),
}));

// Mock child components to keep test focused
jest.mock("@/components/dashboard/DashboardBackground", () => ({
  DashboardBackground: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="db-bg">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: ({ userEmail }: { userEmail: string }) => (
    <div data-testid="db-header">{userEmail}</div>
  ),
}));

jest.mock("@/components/settings/AccountInformation", () => ({
  AccountInformation: ({ onRecruiterToggle }: { onRecruiterToggle: (value: boolean) => void }) => (
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
  }: {
    onDisplayNameChange: (value: string) => void;
    onCompanyNameChange: (value: string) => void;
    onSaveDisplayName: () => void;
    onSaveCompanyName: () => void;
    displayName: string;
    companyName: string;
  }) => (
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
  Notification: ({ text }: { text: string }) => <div data-testid="notification">{text}</div>,
}));

import SettingsPage from "@/app/profile/settings/page";

describe("SettingsPage (app/profile/settings)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    // Reset to default mock settings before each test
    mockCurrentSettings = mockCreateSettings();
  });

  it("renders heading and child placeholders when user present", async () => {
    const { getByText, getByTestId } = render((<SettingsPage />) as any);

    await waitFor(() => {
      expect(getByText("Your Profile")).toBeInTheDocument();
      expect(getByTestId("db-header")).toBeInTheDocument();
      expect(getByTestId("account-info")).toBeInTheDocument();
      expect(getByTestId("profile-details")).toBeInTheDocument();
    });
  });

  it("saves display name independently without overwriting company name", async () => {
    // Set initial mock settings
    mockCurrentSettings = mockCreateSettings({
      isRecruiter: true,
      displayName: "Old Name",
      companyName: "Old Company",
    });

    // Mock fetch for PUT requests
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
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

    // Wait for initial load with hook-provided data
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
    // Set initial mock settings
    mockCurrentSettings = mockCreateSettings({
      isRecruiter: true,
      displayName: "Old Name",
      companyName: "Old Company",
    });

    // Mock fetch for PUT requests
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
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

    // Wait for initial load with hook-provided data
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
