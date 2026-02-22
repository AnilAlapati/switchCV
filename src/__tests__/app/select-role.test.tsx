/**
 * Tests for Select Role Page
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import SelectRolePage from "@/app/select-role/page";
import { redirectWindow } from "@/lib/utils/window";

// Mock modules
jest.mock("next/navigation", () => ({
    useRouter: jest.fn(),
}));

jest.mock("@/hooks/useAuth");
jest.mock("@/hooks/useUserProfile");
jest.mock("@/lib/utils/window", () => ({
    redirectWindow: jest.fn(),
}));

// Mock firebase
jest.mock("firebase/firestore", () => ({
    doc: jest.fn(),
    setDoc: jest.fn(),
    increment: jest.fn((n) => n),
}));

jest.mock("@/lib/firebase", () => ({
    db: {},
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("SelectRolePage", () => {
    const mockRouter = {
        replace: jest.fn(),
        push: jest.fn(),
    };

    const mockMutate = jest.fn();

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
            });
            (useUserProfile as jest.Mock).mockReturnValue({
                mutate: mockMutate,
                role: null,
                loading: true,
            });

            render(<SelectRolePage />);

            // Check for spinner animation
            expect(document.querySelector(".animate-spin")).toBeInTheDocument();
        });
    });

    describe("Unauthenticated User", () => {
        it("should redirect to auth when no user", async () => {
            (useAuth as jest.Mock).mockReturnValue({
                user: null,
                loading: false,
            });
            (useUserProfile as jest.Mock).mockReturnValue({
                mutate: mockMutate,
                role: null,
                loading: false,
            });

            render(<SelectRolePage />);

            await waitFor(() => {
                expect(mockRouter.replace).toHaveBeenCalledWith("/auth");
            });
        });
    });

    describe("User with Existing Role", () => {
        it("should redirect to dashboard when role is jobseeker", async () => {
            (useAuth as jest.Mock).mockReturnValue({
                user: { uid: "test-uid" },
                loading: false,
            });
            (useUserProfile as jest.Mock).mockReturnValue({
                mutate: mockMutate,
                role: "jobseeker",
                loading: false,
            });

            render(<SelectRolePage />);

            await waitFor(() => {
                expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
            });
        });

        it("should redirect to dashboard when role is recruiter", async () => {
            (useAuth as jest.Mock).mockReturnValue({
                user: { uid: "test-uid" },
                loading: false,
            });
            (useUserProfile as jest.Mock).mockReturnValue({
                mutate: mockMutate,
                role: "recruiter",
                loading: false,
            });

            render(<SelectRolePage />);

            await waitFor(() => {
                expect(mockRouter.replace).toHaveBeenCalledWith("/dashboard");
            });
        });
    });

    describe("Role Selection", () => {
        const mockUser = {
            uid: "test-uid",
            getIdToken: jest.fn().mockResolvedValue("mock-token"),
        };

        beforeEach(() => {
            (useAuth as jest.Mock).mockReturnValue({
                user: mockUser,
                loading: false,
            });
            (useUserProfile as jest.Mock).mockReturnValue({
                mutate: mockMutate,
                role: null,
                loading: false,
            });
        });

        it("should render role selection options", () => {
            render(<SelectRolePage />);

            expect(screen.getByText(/How will you use SwitchCV/i)).toBeInTheDocument();
            expect(screen.getByText(/Job Seeker/i)).toBeInTheDocument();
            expect(screen.getByText(/Recruiter/i)).toBeInTheDocument();
        });

        it("should show job seeker features", () => {
            render(<SelectRolePage />);

            expect(screen.getByText(/Create AI-powered resumes/i)).toBeInTheDocument();
            expect(screen.getByText(/Track who views your resume/i)).toBeInTheDocument();
        });

        it("should show recruiter features", () => {
            render(<SelectRolePage />);

            expect(screen.getByText(/AI-powered candidate search/i)).toBeInTheDocument();
            expect(screen.getByText(/Request contact information/i)).toBeInTheDocument();
        });

        it("should disable continue button when no role selected", () => {
            render(<SelectRolePage />);

            const continueButton = screen.getByRole("button", {
                name: /Continue to Dashboard/i,
            });
            expect(continueButton).toBeDisabled();
        });

        it("should enable continue button when role is selected", async () => {
            render(<SelectRolePage />);

            const jobSeekerButton = screen.getByText(/Job Seeker/i).closest("button");
            if (jobSeekerButton) {
                fireEvent.click(jobSeekerButton);
            }

            await waitFor(() => {
                const continueButton = screen.getByRole("button", {
                    name: /Continue to Dashboard/i,
                });
                expect(continueButton).not.toBeDisabled();
            });
        });

        it("should select job seeker role on click", async () => {
            render(<SelectRolePage />);

            const jobSeekerButton = screen.getByText(/Job Seeker/i).closest("button");
            if (jobSeekerButton) {
                fireEvent.click(jobSeekerButton);
            }

            // Check for selection indicator (checkmark icon)
            await waitFor(() => {
                const selectedIndicator = document.querySelector(
                    '[class*="bg-gradient-to-r"][class*="from-teal"]'
                );
                expect(selectedIndicator).toBeInTheDocument();
            });
        });

        it("should select recruiter role on click", async () => {
            render(<SelectRolePage />);

            const recruiterButton = screen.getByText(/Recruiter/i).closest("button");
            if (recruiterButton) {
                fireEvent.click(recruiterButton);
            }

            // Check for selection indicator
            await waitFor(() => {
                const selectedIndicator = document.querySelector(
                    '[class*="bg-gradient-to-r"][class*="from-blue"]'
                );
                expect(selectedIndicator).toBeInTheDocument();
            });
        });
    });

    describe("Role Submission", () => {
        const mockUser = {
            uid: "test-uid",
            getIdToken: jest.fn().mockResolvedValue("mock-token"),
        };

        beforeEach(() => {
            (useAuth as jest.Mock).mockReturnValue({
                user: mockUser,
                loading: false,
            });
            (useUserProfile as jest.Mock).mockReturnValue({
                mutate: mockMutate,
                role: null,
                loading: false,
            });
        });

        it("should submit role and redirect on success", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });
            mockMutate.mockResolvedValueOnce(undefined);

            render(<SelectRolePage />);

            // Select role
            const jobSeekerButton = screen.getByText(/Job Seeker/i).closest("button");
            if (jobSeekerButton) {
                fireEvent.click(jobSeekerButton);
            }

            await waitFor(() => {
                const continueButton = screen.getByRole("button", {
                    name: /Continue to Dashboard/i,
                });
                expect(continueButton).not.toBeDisabled();
            });

            // Submit
            const continueButton = screen.getByRole("button", {
                name: /Continue to Dashboard/i,
            });
            fireEvent.click(continueButton);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith("/api/user/role", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer mock-token",
                    },
                    body: JSON.stringify({ role: "jobseeker" }),
                });
            });

            await waitFor(() => {
                expect(redirectWindow).toHaveBeenCalledWith("/dashboard");
            }, { timeout: 2000 });
        });

        it("should show error on API failure", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: "Failed to update role" }),
            });

            render(<SelectRolePage />);

            // Select role
            const jobSeekerButton = screen.getByText(/Job Seeker/i).closest("button");
            if (jobSeekerButton) {
                fireEvent.click(jobSeekerButton);
            }

            await waitFor(() => {
                const continueButton = screen.getByRole("button", {
                    name: /Continue to Dashboard/i,
                });
                expect(continueButton).not.toBeDisabled();
            });

            // Submit
            const continueButton = screen.getByRole("button", {
                name: /Continue to Dashboard/i,
            });
            fireEvent.click(continueButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to update role/i)).toBeInTheDocument();
            });
        });

        it("should show loading state while submitting", async () => {
            mockFetch.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    ok: true,
                                    json: () => Promise.resolve({ success: true }),
                                }),
                            100
                        )
                    )
            );

            render(<SelectRolePage />);

            // Select role
            const jobSeekerButton = screen.getByText(/Job Seeker/i).closest("button");
            if (jobSeekerButton) {
                fireEvent.click(jobSeekerButton);
            }

            await waitFor(() => {
                const continueButton = screen.getByRole("button", {
                    name: /Continue to Dashboard/i,
                });
                expect(continueButton).not.toBeDisabled();
            });

            // Submit
            const continueButton = screen.getByRole("button", {
                name: /Continue to Dashboard/i,
            });
            fireEvent.click(continueButton);

            // Check for loading state
            await waitFor(() => {
                expect(screen.getByText(/Setting up/i)).toBeInTheDocument();
            });
        });
    });
});
