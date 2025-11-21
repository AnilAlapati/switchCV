// src/__tests__/app/auth/page.test.tsx
import { render, screen } from "@testing-library/react";
import AuthPage from "@/app/auth/page";

// Mock the hooks
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    signUp: jest.fn(),
  }),
}));

// Mock Next.js router and navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AuthPage", () => {
  it("should render the auth page", () => {
    render(<AuthPage />);

    expect(screen.getByText("SwitchCV")).toBeTruthy();
    expect(screen.getByText("Welcome Back")).toBeTruthy();
    expect(screen.getByText("Sign in to access your dashboard")).toBeTruthy();
  });

  it("should have email and password inputs", () => {
    render(<AuthPage />);

    expect(screen.getByLabelText("Email Address")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });

  it("should have sign in button", () => {
    render(<AuthPage />);

    expect(screen.getByText("Sign In")).toBeTruthy();
  });

  it("should have toggle to sign up", () => {
    render(<AuthPage />);

    expect(screen.getByText("Don't have an account? Sign up")).toBeTruthy();
  });
});
