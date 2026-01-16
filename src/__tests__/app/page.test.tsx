// src/__tests__/app/page.test.tsx
import type { ReactNode } from "react";
import { render, screen, act } from "@/__tests__/__support__/testUtils";
import Home from "../../app/page";

// Mock use-intl before any component imports
jest.mock("use-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: jest.fn(),
    number: jest.fn(),
  }),
}));

// Mock LanguageSwitcher component to avoid use-intl issues
jest.mock("@/components/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher">EN</div>,
}));

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

// Mock the useAuth hook
jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

// Mock useGlobalStats
jest.mock("../../hooks/useGlobalStats", () => ({
  useGlobalStats: () => ({
    stats: { resumes: "100+", jobSeekers: "50+", recruiters: "10+" },
  }),
}));

// Mock useHeroBackground (internal) is hard, but we can mock subcomponents
jest.mock("@/components/home/writer/WriterHero", () => ({
  WriterHero: ({ stats }: { stats: { users: number; resumes: number } }) => (
    <div>
      <h1>SwitchCV</h1>
      <p>Autonomous Career Agent</p>
      <div>{stats?.resumes} Resumes</div>
    </div>
  ),
}));
jest.mock("@/components/home/writer/WriterFeatureCards", () => ({
  WriterFeatureCards: () => (
    <div>
      <div>Privacy Controls</div>
      <div>AI Resume Builder</div>
      <div>View Tracking</div>
      <div>AI-Powered Search</div>
    </div>
  ),
}));
jest.mock("@/components/home/writer/WriterHeader", () => ({
  WriterHeader: () => <header>Header</header>,
}));
jest.mock("@/components/home/HomeFooterCta", () => ({
  HomeFooterCta: () => (
    <div>
      <button>Get Started</button>
      <a href="/auth">Sign In</a>
      <a href="/auth?mode=signup">Sign Up</a>
    </div>
  ),
}));
jest.mock("@/components/home/LandingFooter", () => ({
  LandingFooter: () => <footer>Footer</footer>,
}));

describe("Home", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render the main heading", async () => {
    await act(async () => {
      render(<Home />);
    });

    expect(screen.getByText("SwitchCV")).toBeInTheDocument();
  });

  it("should render the tagline", async () => {
    await act(async () => {
      render(<Home />);
    });

    expect(
      screen.getByText(/Autonomous Career Agent/i)
    ).toBeInTheDocument();
  });

  it("should render get started button", async () => {
    await act(async () => {
      render(<Home />);
    });
    const getStartedButton = screen.getByRole("button", {
      name: /Get Started/i,
    });
    expect(getStartedButton).toBeDefined();

    const signupLink = screen.getByRole("link", { name: /Sign Up/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute("href", "/auth?mode=signup");
  });

  it("should render sign in button", async () => {
    await act(async () => {
      render(<Home />);
    });
    const signInLink = screen.getByRole("link", { name: /Sign In/i });
    expect(signInLink).toBeDefined();

    expect(signInLink).toHaveAttribute("href", "/auth");
  });

  it("should render feature cards", async () => {
    await act(async () => {
      render(<Home />);
    });

    expect(screen.getByText("Privacy Controls")).toBeInTheDocument();
    expect(screen.getByText("AI Resume Builder")).toBeInTheDocument();
    expect(screen.getByText("View Tracking")).toBeInTheDocument();
    expect(screen.getByText("AI-Powered Search")).toBeInTheDocument();
  });
});
