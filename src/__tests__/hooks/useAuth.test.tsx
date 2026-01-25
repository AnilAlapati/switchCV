import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import * as firebase from "firebase/auth";
import * as firestore from "firebase/firestore";
import { createMockFirebaseUser } from "@/__tests__/support/mocks/firebase";

// Mock Firebase modules
jest.mock("firebase/auth");
jest.mock("firebase/firestore", () => ({
  getDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(),
}));
jest.mock("@/lib/firebase");
jest.mock("@/context/ConnectivityStatusProvider", () => ({
  useConnectivityStatus: jest.fn(() => ({
    firebase: { isReady: true, error: null },
  })),
}));
jest.mock("@/lib/errorReporter");
jest.mock("@/lib/logger");

const mockAuthHelpers = {
  reserveUsername: jest.fn().mockResolvedValue("username"),
  ensureUserProfile: jest.fn().mockResolvedValue({ needsUsername: false }),
  releaseUsernameReservation: jest.fn(),
};

jest.mock("@/hooks/useAuth.helpers", () => ({
  createAuthProfileHelpers: jest.fn(() => mockAuthHelpers),
  isPasswordProvider: jest.fn((user) => {
    // Check if user has a password provider
    if (!user) return false;
    return (user.providerData || []).some(
      (provider: { providerId: string }) => provider.providerId === "password",
    );
  }),
  sanitizeUsername: jest.fn((username) =>
    username?.toLowerCase().replace(/\s+/g, "_"),
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
      },
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
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
      },
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
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
      },
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("verificationEmail")).toHaveTextContent(
        "newuser@example.com",
      );
    });
  });

  it("should handle no user (logged out state)", async () => {
    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(null);
        return jest.fn();
      },
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
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
      },
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
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("needs-verification")).toHaveTextContent(
        "required",
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
      },
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
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("needs-verification")).toHaveTextContent(
        "not-required",
      );
    });
  });

  it("should provide useAuth context hook", async () => {
    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, callback) => {
        callback(null);
        return jest.fn();
      },
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
      </AuthProvider>,
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
      },
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
      </AuthProvider>,
    );

    // When Firebase is not ready, loading should become false
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });
  });
});

describe("useAuth hook - Auth Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset connectivity to positive state
    const {
      useConnectivityStatus,
    } = require("@/context/ConnectivityStatusProvider");
    (useConnectivityStatus as jest.Mock).mockReturnValue({
      firebase: { isReady: true, error: null },
    });

    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, cb) => {
        cb(null);
        return jest.fn();
      },
    );
  });

  const ActionTestComponent = ({
    onAuthReady,
  }: {
    onAuthReady: (auth: any) => void;
  }) => {
    const auth = useAuth();
    React.useEffect(() => {
      if (!auth.loading) onAuthReady(auth);
    }, [auth.loading, auth, onAuthReady]);
    return null;
  };

  it("should successfully sign in", async () => {
    const mockUser = { email: "test@example.com" };
    (firebase.signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    const { ensureUserProfile } =
      require("@/hooks/useAuth.helpers").createAuthProfileHelpers();
    (ensureUserProfile as jest.Mock).mockClear();

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    await authInstance.signIn("test@example.com", "password");

    expect(firebase.signInWithEmailAndPassword).toHaveBeenCalled();
    expect(ensureUserProfile).toHaveBeenCalledWith(mockUser);
  });

  it("should successfully sign up", async () => {
    const mockUser = {
      uid: "new-uid",
      email: "new@test.com",
      getIdToken: jest.fn().mockResolvedValue("tok"),
    };
    (firebase.createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    const { createAuthProfileHelpers } = require("@/hooks/useAuth.helpers");
    const mockHelpers = createAuthProfileHelpers();

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    await authInstance.signUp("new@test.com", "password", "newuser");

    expect(firebase.createUserWithEmailAndPassword).toHaveBeenCalled();
    expect(mockHelpers.reserveUsername).toHaveBeenCalledWith(
      "new-uid",
      "newuser",
      expect.anything(),
    );
  });

  it("should rollback on signUp failure", async () => {
    const mockUser = { uid: "bad-uid", delete: jest.fn() };
    (firebase.createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    const { createAuthProfileHelpers } = require("@/hooks/useAuth.helpers");
    const mockHelpers = createAuthProfileHelpers();
    (mockHelpers.reserveUsername as jest.Mock).mockRejectedValue(
      new Error("Username taken"),
    );

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    await expect(
      authInstance.signUp("bad@test.com", "pw", "taken"),
    ).rejects.toThrow();

    expect(mockUser.delete).toHaveBeenCalled();
  });

  it("should successfully logout", async () => {
    const mockUser = { uid: "uid123" };
    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, cb) => {
        cb(mockUser);
        return jest.fn();
      },
    );

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    await authInstance.logout();

    expect(firebase.signOut).toHaveBeenCalled();
  });

  it("should sign in with Google", async () => {
    const mockUser = { email: "g@test.com" };
    (firebase.signInWithPopup as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    const { createAuthProfileHelpers } = require("@/hooks/useAuth.helpers");
    const mockHelpers = createAuthProfileHelpers();
    (mockHelpers.ensureUserProfile as jest.Mock).mockResolvedValue({
      needsUsername: true,
    });

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    const result = await authInstance.signInWithGoogle();

    expect(result.needsUsername).toBe(true);
  });

  it("should refresh user", async () => {
    const mockUser = { reload: jest.fn(), getIdToken: jest.fn() };
    require("@/lib/firebase").auth.currentUser = mockUser;

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    await authInstance.refreshUser();

    expect(mockUser.reload).toHaveBeenCalled();
    expect(mockUser.getIdToken).toHaveBeenCalledWith(true);
  });

  it("should check if needs username", async () => {
    const mockUser = { uid: "uid123" };
    (firebase.onAuthStateChanged as jest.Mock).mockImplementation(
      (auth, cb) => {
        cb(mockUser);
        return jest.fn();
      },
    );

    (firestore.getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ username: null, needsUsername: true }),
    });

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    const needs = await authInstance.checkNeedsUsername();

    expect(needs).toBe(true);
  });

  it("should resend verification email", async () => {
    const { httpsCallable } = require("firebase/functions");
    const mockResend = jest.fn().mockResolvedValue({});
    httpsCallable.mockReturnValue(mockResend);
    require("@/lib/firebase").auth.currentUser = { email: "test@test.com" };

    let authInstance: any;
    render(
      <AuthProvider>
        <ActionTestComponent
          onAuthReady={(a) => {
            authInstance = a;
          }}
        />
      </AuthProvider>,
    );

    await waitFor(() => expect(authInstance).toBeDefined());
    await authInstance.resendVerificationEmail();

    expect(mockResend).toHaveBeenCalled();
  });
});
