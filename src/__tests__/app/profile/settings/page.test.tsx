import React from "react";
import { render } from "../../../__support__/testUtils";

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "u1", email: "test@example.com" },
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
  AccountInformation: () => <div data-testid="account-info" />,
}));

jest.mock("@/components/settings/ProfileDetails", () => ({
  ProfileDetails: () => <div data-testid="profile-details" />,
}));

jest.mock("@/components/settings/Notification", () => ({
  Notification: ({ text }: any) => <div data-testid="notification">{text}</div>,
}));

import SettingsPage from "@/app/profile/settings/page";

describe("SettingsPage (app/profile/settings)", () => {
  it("renders heading and child placeholders when user present", () => {
    const { getByText, getByTestId } = render((<SettingsPage />) as any);

    expect(getByText("Settings & Profile")).toBeInTheDocument();
    expect(getByTestId("db-header")).toBeInTheDocument();
    expect(getByTestId("account-info")).toBeInTheDocument();
    expect(getByTestId("profile-details")).toBeInTheDocument();
  });
});
