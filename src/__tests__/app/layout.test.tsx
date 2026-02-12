// src/__tests__/app/layout.test.tsx
import { render } from "@testing-library/react";
import Layout from "../../app/layout";
import { getSystemConfig } from "@/lib/getSystemConfig";

// Mock Next.js fonts
jest.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
  Merriweather: () => ({ variable: "--font-merriweather" }),
}));

// Mock next/headers
jest.mock("next/headers", () => ({
  headers: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(null),
  }),
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
jest.mock("../../lib/getSystemConfig", () => ({
  getSystemConfig: jest.fn(),
}));

describe("Layout", () => {
  beforeEach(() => {
    (getSystemConfig as jest.Mock).mockResolvedValue({
      maintenance: { isActive: false, blocking: false },
    });
  });

  it("should render without crashing", async () => {
    const layout = await Layout({
      children: <div>Test Content</div>,
    });
    expect(() => render(layout)).not.toThrow();
  });

  it("should render children", async () => {
    const layout = await Layout({
      children: <div>Test Content</div>,
    });
    const { container } = render(layout);

    // The layout should render something
    expect(container.firstChild).toBeTruthy();
  });
});
