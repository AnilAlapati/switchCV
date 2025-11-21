// src/__tests__/app/page.test.tsx
import type { ReactNode } from "react";
import { render, screen } from "@/__tests__/__support__/testUtils";
import Home from "../../app/page";

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
    ...rest
  }: {
    children: ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );

  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock the useAuth hook (already mocked in jest.setup.js but keeping for clarity)
jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

describe("Home", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the main heading", () => {
    render(<Home />);

    expect(screen.getByText("SwitchCV")).toBeInTheDocument();
  });

  it("should render the tagline", () => {
    render(<Home />);

    expect(
      screen.getByText(/Tell your career story with privacy-first controls/i)
    ).toBeInTheDocument();
  });

  it("should render get started button", () => {
    render(<Home />);
    const button = screen.queryByText(/Get Started/i);
    expect(button).toBeInTheDocument();

    const signupLink = document.querySelector('a[href*="/auth?mode=signup"]');
    expect(signupLink).not.toBeNull();
  });

  it("should render sign in button", () => {
    render(<Home />);
    const signInElement = screen.queryByText(/Sign In/i);
    expect(signInElement).toBeInTheDocument();

    const signInLink = document.querySelector('a[href="/auth"]');
    expect(signInLink).not.toBeNull();
  });

  it("should render feature cards", () => {
    render(<Home />);

    expect(screen.getByText("Privacy Controls")).toBeInTheDocument();
    expect(screen.getByText("AI Resume Polish")).toBeInTheDocument();
    expect(screen.getByText("Smart Sharing")).toBeInTheDocument();
    expect(screen.getByText("Collaboration Ready")).toBeInTheDocument();
  });
});
