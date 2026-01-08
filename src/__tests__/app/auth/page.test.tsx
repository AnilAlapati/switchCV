import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthPage from "@/app/auth/page";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";

// Mock hooks
jest.mock("@/hooks/useAuth");
jest.mock("next/navigation");
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

// Mock fetch for username availability check
global.fetch = jest.fn();

// Mock child components that might cause issues or aren't relevant to logic
jest.mock("@/components/auth/AuthBackground", () => ({
  AuthBackground: () => <div data-testid="auth-background" />,
}));
jest.mock("@/components/auth/AuthBrand", () => ({
  AuthBrand: () => <div data-testid="auth-brand" />,
}));
jest.mock("@/components/auth/AuthFormInputs", () => ({
  AuthFormInputs: ({
    usernameError,
    onEmailChange,
    onPasswordChange,
    onUsernameChange,
    showUsername,
  }: any) => (
    <div>
      <input
        aria-label="Email Address"
        onChange={(e) => onEmailChange(e.target.value)}
      />
      <input
        aria-label="Password"
        onChange={(e) => onPasswordChange(e.target.value)}
      />
      {showUsername && (
        <>
          <input
            aria-label="Username"
            onChange={(e) => onUsernameChange(e.target.value)}
          />
          {usernameError && (
            <div data-testid="username-error">{usernameError}</div>
          )}
        </>
      )}
    </div>
  ),
}));
jest.mock("@/components/auth/EmailVerificationNotice", () => ({
  EmailVerificationNotice: ({ onResend, onRefresh }: any) => (
    <div data-testid="verification-notice">
      <button onClick={onResend}>Resend</button>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  ),
}));

// Mock useDebounce to return value immediately (no delay)
jest.mock("@/hooks/useDebounce", () => ({
  useDebouncedValue: (value: string) => ({
    debouncedValue: value,
    isPending: false,
  }),
  useDebounce: (value: string) => value,
}));

describe("AuthPage", () => {
  const mockSignIn = jest.fn();
  const mockSignUp = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockResendVerificationEmail = jest.fn();
  const mockRefreshUser = jest.fn();
  const mockCheckNeedsUsername = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch for username availability check - return available by default
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ available: true, username: "testuser" }),
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(),
    });

    mockSignInWithGoogle.mockResolvedValue({ needsUsername: false });
    mockCheckNeedsUsername.mockResolvedValue(false);

    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      needsEmailVerification: false,
      needsUsername: false,
      verificationEmail: null,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithGoogle: mockSignInWithGoogle,
      resendVerificationEmail: mockResendVerificationEmail,
      refreshUser: mockRefreshUser,
      checkNeedsUsername: mockCheckNeedsUsername,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders sign in form by default", () => {
    render(<AuthPage />);
    expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  });

  it("switches to sign up form", () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));

    expect(screen.getByText("Join the Future")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });

  it("handles sign in submission", async () => {
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        "test@example.com",
        "password123"
      );
    });
  });

  it("handles sign up submission", async () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    // Wait for the username availability check to complete
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/user/username/check")
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
        "testuser"
      );
    });
  });

  it("validates username on sign up", async () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByText("Don't have an account? Sign up"));

    // Leave username empty
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByTestId("username-error")).toHaveTextContent(
      /Username is required/i
    );
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("handles google sign in", async () => {
    mockSignInWithGoogle.mockResolvedValue({ needsUsername: false });
    render(<AuthPage />);
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to choose-username if Google user needs username", async () => {
    mockSignInWithGoogle.mockResolvedValue({ needsUsername: true });
    render(<AuthPage />);
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/auth/choose-username");
    });
  });

  it("redirects to dashboard if already logged in", async () => {
    mockCheckNeedsUsername.mockResolvedValue(false);

    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
      needsEmailVerification: false,
      needsUsername: false,
      checkNeedsUsername: mockCheckNeedsUsername,
    });

    render(<AuthPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("redirects to choose-username if existing user needs username", async () => {
    mockCheckNeedsUsername.mockResolvedValue(true);

    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
      needsEmailVerification: false,
      needsUsername: true,
      checkNeedsUsername: mockCheckNeedsUsername,
    });

    render(<AuthPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/choose-username");
    });
  });

  it("shows verification notice when needed", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { uid: "123" },
      loading: false,
      needsEmailVerification: true,
      needsUsername: false,
      verificationEmail: "test@example.com",
      resendVerificationEmail: mockResendVerificationEmail,
      refreshUser: mockRefreshUser,
      checkNeedsUsername: mockCheckNeedsUsername,
    });

    render(<AuthPage />);
    expect(screen.getByTestId("verification-notice")).toBeInTheDocument();
  });
});
