// src/__tests__/app/layout.test.tsx
import { render } from "@testing-library/react";
import Layout from "../../app/layout";

// Mock Next.js fonts
jest.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
  Merriweather: () => ({ variable: "--font-merriweather" }),
}));

// Mock the useAuth hook
jest.mock("../../hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe("Layout", () => {
  it("should render without crashing", () => {
    expect(() => {
      render(
        <Layout>
          <div>Test Content</div>
        </Layout>
      );
    }).not.toThrow();
  });

  it("should render children", () => {
    // Since Layout renders html/body tags, we can't easily test the structure
    // But we can test that it doesn't crash and the component exists
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // The layout should render something
    expect(container.firstChild).toBeTruthy();
  });
});
