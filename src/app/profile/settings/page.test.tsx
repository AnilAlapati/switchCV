import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SettingsPage from "./page";
import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useResume");
jest.mock("@/hooks/useUserSettings");
jest.mock("@/hooks/useUserProfile");
jest.mock("next/navigation");
jest.mock("@/lib/logger");

// Mock components
jest.mock("@/components/dashboard/DashboardBackground", () => ({
    DashboardBackground: ({ children }: any) => <div data-testid="background">{children}</div>,
}));
jest.mock("@/components/dashboard/DashboardHeader", () => ({
    DashboardHeader: ({ onLogout }: any) => (
        <header>
            <button data-testid="logout-button" onClick={onLogout}>Logout</button>
        </header>
    ),
}));
jest.mock("@/components/settings/AccountInformation", () => ({
    AccountInformation: ({ onRecruiterToggle, onCopy, isRecruiter }: any) => (
        <div data-testid="account-info">
            <button data-testid="recruiter-toggle" onClick={() => onRecruiterToggle(!isRecruiter)}>
                Toggle Recruiter
            </button>
            <button data-testid="copy-button" onClick={onCopy}>Copy ID</button>
        </div>
    ),
}));
jest.mock("@/components/settings/ProfileDetails", () => ({
    ProfileDetails: ({ onDisplayNameChange, onCompanyNameChange, onSaveDisplayName, onSaveCompanyName }: any) => (
        <div data-testid="profile-details">
            <input data-testid="display-name-input" onChange={(e) => onDisplayNameChange(e.target.value)} />
            <input data-testid="company-name-input" onChange={(e) => onCompanyNameChange(e.target.value)} />
            <button data-testid="save-display-name" onClick={onSaveDisplayName}>Save Name</button>
            <button data-testid="save-company-name" onClick={onSaveCompanyName}>Save Company</button>
        </div>
    ),
}));
jest.mock("@/components/settings/Notification", () => ({
    Notification: ({ type, text }: any) => <div data-testid="notification" className={type}>{text}</div>,
}));
jest.mock("@/components/settings/ProfileSettingsSkeleton", () => ({
    ProfileSettingsSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

describe("SettingsPage", () => {
    const mockRouter = {
        push: jest.fn(),
        replace: jest.fn(),
        refresh: jest.fn(),
    };
    const mockLogout = jest.fn();
    const mockMutateSettings = jest.fn();
    const mockMutateProfile = jest.fn();
    const mockUser = { uid: "user123", email: "test@example.com", getIdToken: jest.fn().mockResolvedValue("token") };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useAuth as jest.Mock).mockReturnValue({
            user: mockUser,
            logout: mockLogout,
            loading: false,
            needsEmailVerification: false,
        });
        (useResume as jest.Mock).mockReturnValue({ resumeId: "res123", hasResume: true });
        (useUserSettings as jest.Mock).mockReturnValue({
            settings: { isRecruiter: false, displayName: "Test User", companyName: "", updatedAt: "" },
            loading: false,
            mutate: mockMutateSettings,
        });
        (useUserProfile as jest.Mock).mockReturnValue({ mutate: mockMutateProfile });
        global.fetch = jest.fn();
    });

    it("renders loading state", () => {
        (useUserSettings as jest.Mock).mockReturnValue({
            settings: null,
            loading: true,
            mutate: mockMutateSettings,
        });
        render(<SettingsPage />);
        expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });

    it("redirects if unauthenticated", () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: null,
            loading: false,
            needsEmailVerification: false,
        });
        render(<SettingsPage />);
        expect(mockRouter.push).toHaveBeenCalled();
    });

    it("handles logout", async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByTestId("logout-button"));
        await waitFor(() => {
            expect(mockLogout).toHaveBeenCalled();
            expect(mockRouter.replace).toHaveBeenCalledWith("/auth");
        });
    });

    it("handles recruiter toggle success", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        render(<SettingsPage />);

        fireEvent.click(screen.getByTestId("recruiter-toggle"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/user/settings", expect.any(Object));
            expect(mockMutateSettings).toHaveBeenCalled();
            expect(mockMutateProfile).toHaveBeenCalled();
            expect(screen.getByTestId("notification")).toHaveTextContent("Account type updated!");
        });
    });

    it("handles recruiter toggle failure", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
        render(<SettingsPage />);

        fireEvent.click(screen.getByTestId("recruiter-toggle"));

        await waitFor(() => {
            expect(screen.getByTestId("notification")).toHaveClass("error");
            expect(mockMutateSettings).toHaveBeenCalled(); // Revalidate on error
        });
    });

    it("handles save display name success", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        render(<SettingsPage />);

        fireEvent.change(screen.getByTestId("display-name-input"), { target: { value: "New Name" } });
        fireEvent.click(screen.getByTestId("save-display-name"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/user/settings", expect.any(Object));
            expect(screen.getByTestId("notification")).toHaveTextContent("Display name saved!");
        });
    });

    it("handles save display name validation failure", async () => {
        render(<SettingsPage />);

        fireEvent.change(screen.getByTestId("display-name-input"), { target: { value: " " } });
        fireEvent.click(screen.getByTestId("save-display-name"));

        expect(screen.getByTestId("notification")).toHaveTextContent("Please enter a display name.");
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("handles save company name success", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        render(<SettingsPage />);

        fireEvent.change(screen.getByTestId("company-name-input"), { target: { value: "New Company" } });
        fireEvent.click(screen.getByTestId("save-company-name"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/user/settings", expect.any(Object));
            expect(screen.getByTestId("notification")).toHaveTextContent("Company name saved!");
        });
    });

    it("handles copy resume ID", () => {
        const mockClipboard = {
            writeText: jest.fn(),
        };
        Object.assign(navigator, { clipboard: mockClipboard });

        render(<SettingsPage />);
        fireEvent.click(screen.getByTestId("copy-button"));

        expect(mockClipboard.writeText).toHaveBeenCalledWith("res123");
        expect(screen.getByTestId("notification")).toHaveTextContent("Resume ID copied to clipboard!");
    });

    it("handles fetch error during save", async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
        render(<SettingsPage />);

        fireEvent.change(screen.getByTestId("display-name-input"), { target: { value: "Name" } });
        fireEvent.click(screen.getByTestId("save-display-name"));

        await waitFor(() => {
            expect(screen.getByTestId("notification")).toHaveTextContent("Network error");
        });
    });

    it("handles missing user ID in handlers", async () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: { uid: null },
            loading: false,
            needsEmailVerification: false,
        });
        render(<SettingsPage />);

        fireEvent.click(screen.getByTestId("recruiter-toggle"));
        expect(screen.getByTestId("notification")).toHaveTextContent("User ID not available");

        fireEvent.change(screen.getByTestId("display-name-input"), { target: { value: "Name" } });
        fireEvent.click(screen.getByTestId("save-display-name"));
        expect(screen.getByTestId("notification")).toHaveTextContent("User ID not available");

        fireEvent.change(screen.getByTestId("company-name-input"), { target: { value: "Company" } });
        fireEvent.click(screen.getByTestId("save-company-name"));
        expect(screen.getByTestId("notification")).toHaveTextContent("User ID not available");
    });

    it("handles logout error", async () => {
        mockLogout.mockRejectedValue(new Error("Logout fail"));
        render(<SettingsPage />);

        fireEvent.click(screen.getByTestId("logout-button"));
        await waitFor(() => {
            expect(logger.error).toHaveBeenCalled();
        });
    });

    it("handles save company name validation failure", async () => {
        render(<SettingsPage />);

        fireEvent.change(screen.getByTestId("company-name-input"), { target: { value: "" } });
        fireEvent.click(screen.getByTestId("save-company-name"));

        expect(screen.getByTestId("notification")).toHaveTextContent("Please enter a company name.");
    });

    it("handles save company name failure branch", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
        render(<SettingsPage />);

        fireEvent.change(screen.getByTestId("company-name-input"), { target: { value: "Company" } });
        fireEvent.click(screen.getByTestId("save-company-name"));

        await waitFor(() => {
            expect(screen.getByTestId("notification")).toHaveClass("error");
        });
    });

    it("handles save display name failure branch", async () => {
        (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
        render(<SettingsPage />);

        fireEvent.change(screen.getByTestId("display-name-input"), { target: { value: "New Name" } });
        fireEvent.click(screen.getByTestId("save-display-name"));

        await waitFor(() => {
            expect(screen.getByTestId("notification")).toHaveClass("error");
        });
    });
});
