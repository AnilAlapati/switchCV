/**
 * Tests for Choose Username Page
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ChooseUsernamePage from "@/app/auth/choose-username/page";

// Mock modules
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("@/hooks/useAuth");

// Mock SystemConfigProvider
jest.mock("@/context/SystemConfigProvider", () => {
    const { defaultSystemConfig } = jest.requireActual("@/lib/system-config");
    return {
        useSystemConfig: () => ({
            config: defaultSystemConfig,
            loading: false,
            refresh: jest.fn(),
        }),
    };
});
jest.mock("@/hooks/useDebounce", () => ({
    useDebouncedValue: (value: string) => ({
        debouncedValue: value,
        isPending: false,
    }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ChooseUsernamePage", () => {
    const mockRouter = {
        replace: jest.fn(),
        push: jest.fn(),
    };

    const mockSetUsername = jest.fn();
    const mockCheckNeedsUsername = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        mockFetch.mockReset();
    });

    describe("Loading State", () => {
        it("should show loading spinner when loading", () => {
            (useAuth as jest.Mock).mockReturnValue({
                user: null,
                loading: true,
                setUsername: mockSetUsername,
                checkNeedsUsername: mockCheckNeedsUsername,
            });

            render(<ChooseUsernamePage />);

            expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
        });
    });

    describe("Unauthenticated User", () => {
        it("should redirect to auth when no user", async () => {
            (useAuth as jest.Mock).mockReturnValue({
                user: null,
                loading: false,
                setUsername: mockSetUsername,
                checkNeedsUsername: mockCheckNeedsUsername,
            });

            render(<ChooseUsernamePage />);

            await waitFor(() => {
                expect(mockRouter.replace).toHaveBeenCalledWith("/auth");
            });
        });

        it("should show redirecting message when no user", () => {
            (useAuth as jest.Mock).mockReturnValue({
                user: null,
                loading: false,
                setUsername: mockSetUsername,
                checkNeedsUsername: mockCheckNeedsUsername,
            });

            render(<ChooseUsernamePage />);

            expect(screen.getByText(/Redirecting to sign in/i)).toBeInTheDocument();
        });
    });

    describe("Authenticated User", () => {
        const mockUser = {
            uid: "test-uid",
            email: "test@example.com",
            displayName: "Test User",
        };

        beforeEach(() => {
            mockCheckNeedsUsername.mockResolvedValue(true);
            (useAuth as jest.Mock).mockReturnValue({
                user: mockUser,
                loading: false,
                setUsername: mockSetUsername,
                checkNeedsUsername: mockCheckNeedsUsername,
            });
        });

        it("should render username form for authenticated user", () => {
            render(<ChooseUsernamePage />);

            expect(
                screen.getByText(/Claim Your Byline/i)
            ).toBeInTheDocument();
            expect(
                screen.getByText(/Choose a unique handle/i)
            ).toBeInTheDocument();
        });

        it("should show continue button disabled when no username", () => {
            render(<ChooseUsernamePage />);

            const continueButton = screen.getByRole("button", { name: /Continue/i });
            expect(continueButton).toBeDisabled();
        });

        it("should show skip button", () => {
            render(<ChooseUsernamePage />);

            const skipButton = screen.getByRole("button", { name: /Skip for now/i });
            expect(skipButton).toBeInTheDocument();
        });

        it("should show user email", () => {
            render(<ChooseUsernamePage />);

            expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
        });

        it("should redirect to dashboard if username not needed", async () => {
            mockCheckNeedsUsername.mockResolvedValue(false);

            render(<ChooseUsernamePage />);

            await waitFor(() => {
                expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
            });
        });
    });

    describe("Username Validation", () => {
        const mockUser = {
            uid: "test-uid",
            email: "test@example.com",
        };

        beforeEach(() => {
            mockCheckNeedsUsername.mockResolvedValue(true);
            (useAuth as jest.Mock).mockReturnValue({
                user: mockUser,
                loading: false,
                setUsername: mockSetUsername,
                checkNeedsUsername: mockCheckNeedsUsername,
            });
        });

        it("should check username availability when typing", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve({ available: true }),
            });

            render(<ChooseUsernamePage />);

            const input = screen.getByRole("textbox");
            fireEvent.change(input, { target: { value: "testuser" } });

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith(
                    expect.stringContaining("/api/user/username/check")
                );
            });
        });

        it("should show available message for valid username", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: () => Promise.resolve({ available: true }),
            });

            render(<ChooseUsernamePage />);

            const input = screen.getByRole("textbox");
            fireEvent.change(input, { target: { value: "testuser" } });

            await waitFor(() => {
                expect(screen.getByText(/Username is available/i)).toBeInTheDocument();
            });
        });

        it("should show taken message for unavailable username", async () => {
            mockFetch.mockResolvedValueOnce({
                status: 200,
                json: () =>
                    Promise.resolve({
                        available: false,
                        reason: "Username is already taken",
                    }),
            });

            render(<ChooseUsernamePage />);

            const input = screen.getByRole("textbox");
            fireEvent.change(input, { target: { value: "takenuser" } });

            await waitFor(() => {
                expect(
                    screen.getByText(/Username is already taken/i)
                ).toBeInTheDocument();
            });
        });
    });

    describe("Form Submission", () => {
        const mockUser = {
            uid: "test-uid",
            email: "test@example.com",
        };

        beforeEach(() => {
            mockCheckNeedsUsername.mockResolvedValue(true);
            (useAuth as jest.Mock).mockReturnValue({
                user: mockUser,
                loading: false,
                setUsername: mockSetUsername,
                checkNeedsUsername: mockCheckNeedsUsername,
            });
            mockFetch.mockResolvedValue({
                status: 200,
                json: () => Promise.resolve({ available: true }),
            });
        });

        it("should submit and redirect on success", async () => {
            mockSetUsername.mockResolvedValueOnce(undefined);

            render(<ChooseUsernamePage />);

            const input = screen.getByRole("textbox");
            fireEvent.change(input, { target: { value: "validuser" } });

            await waitFor(() => {
                expect(screen.getByText(/Username is available/i)).toBeInTheDocument();
            });

            const submitButton = screen.getByRole("button", { name: /Continue/i });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockSetUsername).toHaveBeenCalledWith("validuser");
                expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
            });
        });

        it("should show error on submission failure", async () => {
            mockSetUsername.mockRejectedValueOnce(new Error("Failed to set username"));

            render(<ChooseUsernamePage />);

            const input = screen.getByRole("textbox");
            fireEvent.change(input, { target: { value: "validuser" } });

            await waitFor(() => {
                expect(screen.getByText(/Username is available/i)).toBeInTheDocument();
            });

            const submitButton = screen.getByRole("button", { name: /Continue/i });
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to set username/i)).toBeInTheDocument();
            });
        });
    });

    describe("Skip Flow", () => {
        const mockUser = {
            uid: "test-uid",
            email: "test@example.com",
            displayName: "TestUser",
        };

        beforeEach(() => {
            mockCheckNeedsUsername.mockResolvedValue(true);
            (useAuth as jest.Mock).mockReturnValue({
                user: mockUser,
                loading: false,
                setUsername: mockSetUsername,
                checkNeedsUsername: mockCheckNeedsUsername,
            });
        });

        it("should skip and use generated username", async () => {
            mockSetUsername.mockResolvedValueOnce(undefined);

            render(<ChooseUsernamePage />);

            const skipButton = screen.getByRole("button", { name: /Skip for now/i });
            fireEvent.click(skipButton);

            await waitFor(() => {
                expect(mockSetUsername).toHaveBeenCalled();
                expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
            });
        });
    });
});
