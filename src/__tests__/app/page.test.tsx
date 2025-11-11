// src/__tests__/app/page.test.tsx
import { render, screen } from "@testing-library/react";
import Home from "../../app/page";

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the useAuth hook
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
      screen.getByText(/Create and share your professional resume/)
    ).toBeInTheDocument();
  });

  it("should render get started button", () => {
    render(<Home />);

    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("should render sign in button", () => {
    render(<Home />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("should render feature cards", () => {
    render(<Home />);

    expect(screen.getByText("Privacy First")).toBeInTheDocument();
    expect(screen.getByText("AI-Powered")).toBeInTheDocument();
    expect(screen.getByText("Shareable Links")).toBeInTheDocument();
  });
});
