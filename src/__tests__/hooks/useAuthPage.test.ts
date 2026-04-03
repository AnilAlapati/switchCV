import { renderHook, act } from "@testing-library/react";
import { useAuthPage } from "@/hooks/useAuthPage";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { useUsernameChecker, useEmailVerificationHandler } from "@/hooks/useAuthPage.helpers";

// Mock next/navigation
jest.mock("next/navigation", () => ({
    useSearchParams: jest.fn(),
    useRouter: jest.fn(),
}));

// Mock hooks
jest.mock("@/hooks/useAuth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("@/hooks/useDebounce", () => ({
    useDebouncedValue: jest.fn(),
}));

jest.mock("@/hooks/useAuthPage.helpers", () => ({
    useUsernameChecker: jest.fn(),
    useEmailVerificationHandler: jest.fn(),
}));

jest.mock("@/lib/firebase", () => ({
    auth: { currentUser: { reload: jest.fn(), getIdToken: jest.fn() } },
}));

describe("useAuthPage hook", () => {
    const mockRouter = { push: jest.fn() };
    const mockAuth = {
        user: null,
        loading: false,
        needsEmailVerification: false,
        needsUsername: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signInWithGoogle: jest.fn(),
        resendVerificationEmail: jest.fn(),
        refreshUser: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useSearchParams as jest.Mock).mockReturnValue({ get: jest.fn(() => null) });
        (useAuth as jest.Mock).mockReturnValue(mockAuth);
        (useDebouncedValue as jest.Mock).mockReturnValue({ debouncedValue: "", isPending: false });
        (useUsernameChecker as jest.Mock).mockReturnValue({ checkUsernameAvailability: jest.fn() });
    });

    it("should initialize with default state", () => {
        const { result } = renderHook(() => useAuthPage());
        expect(result.current.state.isSignUp).toBe(false);
        expect(result.current.state.email).toBe("");
    });

    it("should handle signup mode from search params", () => {
        (useSearchParams as jest.Mock).mockReturnValue({
            get: jest.fn((key) => (key === "mode" ? "signup" : null)),
        });
        const { result } = renderHook(() => useAuthPage());
        expect(result.current.state.isSignUp).toBe(true);
    });

    it("should handle email verification from search params", async () => {
        const mockSearchParams = { get: jest.fn((key: string) => {
            if (key === "mode") return "verifyEmail";
            if (key === "oobCode") return "test-code";
            return null;
        }) };
        (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

        await act(async () => {
            renderHook(() => useAuthPage());
        });

        // useAuthPage delegates email verification to useEmailVerificationHandler
        expect(useEmailVerificationHandler).toHaveBeenCalledWith(
            expect.objectContaining({ searchParams: mockSearchParams })
        );
    });

    it("should handle successful sign in and redirect", async () => {
        const { result } = renderHook(() => useAuthPage());

        await act(async () => {
            result.current.actions.setEmail("test@test.com");
            result.current.actions.setPassword("password123");
        });

        await act(async () => {
            await result.current.actions.handleSubmit({ preventDefault: jest.fn() } as any);
        });

        expect(mockAuth.signIn).toHaveBeenCalledWith("test@test.com", "password123");
    });

    it("should handle sign up with username and redirect", async () => {
        const { result } = renderHook(() => useAuthPage());

        await act(async () => {
            result.current.actions.setIsSignUp(true);
            result.current.actions.setEmail("new@test.com");
            result.current.actions.setPassword("password123");
            result.current.actions.setUsername("newuser");
        });

        await act(async () => {
            await result.current.actions.handleSubmit({ preventDefault: jest.fn() } as any);
        });

        expect(mockAuth.signUp).toHaveBeenCalledWith("new@test.com", "password123", "newuser");
    });

    it("should handle Google sign in", async () => {
        mockAuth.signInWithGoogle.mockResolvedValue({ needsUsername: false });
        const { result } = renderHook(() => useAuthPage());

        await act(async () => {
            await result.current.actions.handleGoogleSignIn();
        });

        expect(mockAuth.signInWithGoogle).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith("/dashboard");
    });

    it("should handle logout", async () => {
        const mockLogout = jest.fn();
        (useAuth as jest.Mock).mockReturnValue({ ...mockAuth, logout: mockLogout });
        const { result } = renderHook(() => useAuthPage());

        await act(async () => {
            await result.current.actions.logout();
        });

        expect(mockLogout).toHaveBeenCalled();
    });

    it("should resend verification email", async () => {
        const { result } = renderHook(() => useAuthPage());

        await act(async () => {
            await result.current.actions.handleResend();
        });

        expect(mockAuth.resendVerificationEmail).toHaveBeenCalled();
    });

    it("should refresh verification status", async () => {
        const { result } = renderHook(() => useAuthPage());

        await act(async () => {
            await result.current.actions.handleRefreshVerification();
        });

        expect(mockAuth.refreshUser).toHaveBeenCalled();
    });
});
