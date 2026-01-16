import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import * as firebase from "firebase/auth";
import * as firestore from "firebase/firestore";
import { createMockFirebaseUser } from "@/__tests__/support/mocks/firebase";

// Mock Firebase modules
jest.mock("firebase/auth");
jest.mock("firebase/firestore");
jest.mock("@/lib/firebase");
jest.mock("@/context/ConnectivityStatusProvider", () => ({
  useConnectivityStatus: jest.fn(() => ({
    firebase: { isReady: true, error: null },
  })),
}));
jest.mock("@/lib/errorReporter");
jest.mock("@/lib/logger");
jest.mock("@/hooks/useAuth.helpers", () => ({
  createAuthProfileHelpers: jest.fn(() => ({
    reserveUsername: jest.fn().mockResolvedValue("username"),
    ensureUserProfile: jest.fn().mockResolvedValue({ needsUsername: false }),
    releaseUsernameReservation: jest.fn(),
  })),
  isPasswordProvider: jest.fn((user) => {
    // Check if user has a password provider
    if (!user) return false;
    return (user.providerData || []).some(
      (provider: { providerId: string }) => provider.providerId === "password"
    );
  }),
  sanitizeUsername: jest.fn((username) =>
    username?.toLowerCase().replace(/\s+/g, "_")
  ),
  USERNAME_REGEX: /^[a-z0-9_-]{3,30}$/,
}));

describe("useAuth hook - State Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const TestComponent = () => {
    const auth = useAuth();
    return (
      <div>
        <div data-testid="user-status">
          {auth.user ? "logged-in" : "logged-out"}
        </div>
        <div data-testid="loading">{auth.loading ? "loading" : "ready"}</div>
        <div data-testid="needsUsername">
          {auth.needsUsername ? "yes" : "no"}
        </div>
        <div data-testid="verificationEmail">
          {auth.verificationEmail || "none"}
        </div>
      </div>
    );
  };

  it("should initialize with loading state", async () => {
    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        setTimeout(() => callback(null), 0);
        return jest.fn();
      }
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");

    // Should transition to ready
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });
  });

  it("should set user when auth state changes", async () => {
    const mockUser = createMockFirebaseUser({
      uid: "test-uid",
      email: "test@example.com",
      emailVerified: true,
    });

    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(mockUser);
        return jest.fn();
      }
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("logged-in");
    });
  });

  it("should set verification email from signed user", async () => {
    const mockUser = createMockFirebaseUser({
      uid: "test-uid",
      email: "newuser@example.com",
      emailVerified: false,
    });

    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(mockUser);
        return jest.fn();
      }
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("verificationEmail")).toHaveTextContent(
        "newuser@example.com"
      );
    });
  });

  it("should handle no user (logged out state)", async () => {
    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(null);
        return jest.fn();
      }
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("logged-out");
    });
  });

  it("should detect email verification requirement for password provider", async () => {
    const mockUser = createMockFirebaseUser({
      uid: "test-uid",
      email: "unverified@example.com",
      emailVerified: false,
      providerData: [{ providerId: "password" }] as any,
    });

    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(mockUser);
        return jest.fn();
      }
    );

    const VerificationTestComponent = () => {
      const { needsEmailVerification } = useAuth();
      return (
        <div data-testid="needs-verification">
          {needsEmailVerification ? "required" : "not-required"}
        </div>
      );
    };

    render(
      <AuthProvider>
        <VerificationTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("needs-verification")).toHaveTextContent(
        "required"
      );
    });
  });

  it("should not require verification for OAuth providers", async () => {
    const mockUser = createMockFirebaseUser({
      uid: "google-uid",
      email: "google@example.com",
      emailVerified: false,
      providerData: [{ providerId: "google.com" }] as any,
    });

    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(mockUser);
        return jest.fn();
      }
    );

    const VerificationTestComponent = () => {
      const { needsEmailVerification } = useAuth();
      return (
        <div data-testid="needs-verification">
          {needsEmailVerification ? "required" : "not-required"}
        </div>
      );
    };

    render(
      <AuthProvider>
        <VerificationTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("needs-verification")).toHaveTextContent(
        "not-required"
      );
    });
  });

  it("should provide useAuth context hook", async () => {
    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(null);
        return jest.fn();
      }
    );

    const HookTestComponent = () => {
      const auth = useAuth();

      // Verify all expected methods exist
      return (
        <div>
          <div data-testid="has-signIn">
            {typeof auth.signIn === "function" ? "yes" : "no"}
          </div>
          <div data-testid="has-signUp">
            {typeof auth.signUp === "function" ? "yes" : "no"}
          </div>
          <div data-testid="has-logout">
            {typeof auth.logout === "function" ? "yes" : "no"}
          </div>
          <div data-testid="has-google">
            {typeof auth.signInWithGoogle === "function" ? "yes" : "no"}
          </div>
          <div data-testid="has-refresh">
            {typeof auth.refreshUser === "function" ? "yes" : "no"}
          </div>
          <div data-testid="has-resend">
            {typeof auth.resendVerificationEmail === "function" ? "yes" : "no"}
          </div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <HookTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("has-signIn")).toHaveTextContent("yes");
    });

    expect(screen.getByTestId("has-signUp")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-logout")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-google")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-refresh")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-resend")).toHaveTextContent("yes");
  });

  it("should throw error when using hook outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    expect(() => {
      const BadComponent = () => {
        const auth = useAuth();
        return <div>{auth.user?.email}</div>;
      };

      render(<BadComponent />);
    }).toThrow();

    consoleSpy.mockRestore();
  });

  it("should handle Firebase connectivity issues", async () => {
    // Mock the connectivity status to indicate Firebase is not ready
    const mockConnectivityContext = require("@/context/ConnectivityStatusProvider");
    mockConnectivityContext.useConnectivityStatus.mockReturnValue({
      firebase: { isReady: false, error: "Connection failed" },
    });

    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(null);
        return jest.fn();
      }
    );

    const ConnectivityTestComponent = () => {
      const { connectivityIssue, loading } = useAuth();
      return (
        <div>
          <div data-testid="connectivity">
            {connectivityIssue || "connected"}
          </div>
          <div data-testid="loading">{loading ? "loading" : "ready"}</div>
        </div>
      );
    };

    render(
      <AuthProvider>
        <ConnectivityTestComponent />
      </AuthProvider>
    );

    // When Firebase is not ready, loading should become false
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });
  });
});
