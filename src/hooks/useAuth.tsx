// src/hooks/useAuth.tsx
"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      // Check if Firebase is properly initialized
      if (!auth || auth.__isMock) {
        // Avoid synchronous state update in effect
        setTimeout(() => setLoading(false), 0);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.warn("Auth initialization error:", error);
      setTimeout(() => setLoading(false), 0);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      console.error("Sign in error:", authError);
      throw new Error(
        authError.code === "auth/invalid-credential"
          ? "Invalid email or password. Please check your credentials or sign up first."
          : authError.code === "auth/user-not-found"
          ? "No account found with this email. Please sign up first."
          : authError.code === "auth/wrong-password"
          ? "Incorrect password. Please try again."
          : authError.code === "auth/too-many-requests"
          ? "Too many failed login attempts. Please try again later."
          : authError.message || "Failed to sign in"
      );
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as { code?: string; message?: string };
      console.error("Sign up error:", authError);
      throw new Error(
        authError.code === "auth/email-already-in-use"
          ? "This email is already registered. Please sign in instead."
          : authError.code === "auth/weak-password"
          ? "Password should be at least 6 characters."
          : authError.code === "auth/invalid-email"
          ? "Invalid email address."
          : authError.message || "Failed to create account"
      );
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
