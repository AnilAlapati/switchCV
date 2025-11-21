// src/__tests__/hooks/useAuth.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  sendEmailVerification,
} from "firebase/auth";

// Mock Firebase auth/firestore exports
jest.mock("@/lib/firebase", () => ({
  auth: {},
  db: { __isMock: true },
}));

// Mock Firebase Auth
jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    setCustomParameters: jest.fn(),
  })),
  signInWithPopup: jest.fn(),
  sendEmailVerification: jest.fn(),
}));

const mockOnAuthStateChanged = jest.mocked(onAuthStateChanged);
const mockSignInWithEmailAndPassword = jest.mocked(signInWithEmailAndPassword);
const mockCreateUserWithEmailAndPassword = jest.mocked(
  createUserWithEmailAndPassword
);
const mockSignOut = jest.mocked(signOut);
const mockSignInWithPopup = jest.mocked(signInWithPopup);
const mockSendEmailVerification = jest.mocked(sendEmailVerification);

const createMockUser = (overrides: Partial<User> = {}) =>
  ({
    uid: "test-uid",
    email: "test@example.com",
    emailVerified: true,
    displayName: "Test User",
    providerData: [{ providerId: "password" }],
    ...overrides,
  } as unknown as User);

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useAuth", () => {
  let mockUnsubscribe: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();
    mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);
  });

  describe("useAuth hook", () => {
    it("should throw error when used outside AuthProvider", () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        "useAuth must be used within an AuthProvider"
      );
    });

    it("should return auth context when used within AuthProvider", () => {
      const mockUser = createMockUser();
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        (callback as (user: User | null) => void)(mockUser as User);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.loading).toBe(false);
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.logout).toBe("function");
      expect(typeof result.current.signInWithGoogle).toBe("function");
      expect(typeof result.current.resendVerificationEmail).toBe("function");
    });
  });

  describe("AuthProvider", () => {
    it("should show loading state initially", () => {
      mockOnAuthStateChanged.mockImplementation(() => mockUnsubscribe);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
    });

    it("should set user when authenticated", async () => {
      const mockUser = createMockUser();
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        (callback as (user: User | null) => void)(mockUser as User);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it("should handle unauthenticated state", async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        (callback as (user: User | null) => void)(null);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it("should call unsubscribe on unmount", () => {
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    it("should sign in successfully", async () => {
      const mockUser = createMockUser();
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        (callback as (user: User | null) => void)(mockUser as User);
        return mockUnsubscribe;
      });
      mockSignInWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await result.current.signIn("test@example.com", "password123");

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "test@example.com",
        "password123"
      );
    });

    it("should handle invalid credentials error", async () => {
      const mockError = { code: "auth/invalid-credential" };
      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signIn("test@example.com", "wrongpassword")
      ).rejects.toThrow(
        "Invalid email or password. Please check your credentials or sign up first."
      );
    });

    it("should handle user not found error", async () => {
      const mockError = { code: "auth/user-not-found" };
      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signIn("nonexistent@example.com", "password123")
      ).rejects.toThrow(
        "No account found with this email. Please sign up first."
      );
    });

    it("should handle wrong password error", async () => {
      const mockError = { code: "auth/wrong-password" };
      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signIn("test@example.com", "wrongpassword")
      ).rejects.toThrow("Incorrect password. Please try again.");
    });

    it("should handle too many requests error", async () => {
      const mockError = { code: "auth/too-many-requests" };
      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow(
        "Too many failed login attempts. Please try again later."
      );
    });

    it("should handle generic sign in error", async () => {
      const mockError = { message: "Network error" };
      mockSignInWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signIn("test@example.com", "password123")
      ).rejects.toThrow("Network error");
    });
  });

  describe("signUp", () => {
    it("should sign up successfully", async () => {
      const mockUser = createMockUser({ emailVerified: false });
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        (callback as (user: User | null) => void)(mockUser as User);
        return mockUnsubscribe;
      });
      mockCreateUserWithEmailAndPassword.mockResolvedValue({
        user: mockUser,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await result.current.signUp(
        "test@example.com",
        "password123",
        "testuser"
      );

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        "test@example.com",
        "password123"
      );
      expect(mockSendEmailVerification).toHaveBeenCalled();
    });

    it("should handle email already in use error", async () => {
      const mockError = { code: "auth/email-already-in-use" };
      mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signUp(
          "existing@example.com",
          "password123",
          "takenname"
        )
      ).rejects.toThrow(
        "This email is already registered. Please sign in instead."
      );
    });

    it("should handle weak password error", async () => {
      const mockError = { code: "auth/weak-password" };
      mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signUp("test@example.com", "123", "short")
      ).rejects.toThrow("Password should be at least 6 characters.");
    });

    it("should handle invalid email error", async () => {
      const mockError = { code: "auth/invalid-email" };
      mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signUp("invalid-email", "password123", "invalidemail")
      ).rejects.toThrow("Invalid email address.");
    });

    it("should handle generic sign up error", async () => {
      const mockError = { message: "Network error" };
      mockCreateUserWithEmailAndPassword.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        result.current.signUp("test@example.com", "password123", "tester")
      ).rejects.toThrow("Network error");
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      mockSignOut.mockResolvedValue();

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await result.current.logout();

      expect(mockSignOut).toHaveBeenCalledWith({});
    });

    it("should handle logout error", async () => {
      const mockError = new Error("Logout failed");
      mockSignOut.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await expect(result.current.logout()).rejects.toThrow("Logout failed");
    });
  });
});
