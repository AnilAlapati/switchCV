// src/__tests__/app/dashboard/page.test.tsx
import { render, screen } from "@testing-library/react";
import Dashboard from "../../../app/dashboard/page";

// Mock Next.js navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the hooks
jest.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "test@example.com" },
    logout: jest.fn(),
    loading: false,
  }),
}));

jest.mock("../../../hooks/useResume", () => ({
  useResume: () => ({
    hasResume: true,
    resumeSlug: "test-slug",
    loading: false,
  }),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render dashboard with user email", () => {
    render(<Dashboard />);

    expect(screen.getByText("Welcome back, test")).toBeInTheDocument();
  });

  it("should show resume created status", () => {
    render(<Dashboard />);

    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("should show view resume link when resume exists", () => {
    render(<Dashboard />);

    const viewResumeLink = screen.getByText("View Resume");
    expect(viewResumeLink).toBeInTheDocument();
    expect(viewResumeLink.closest("a")).toHaveAttribute(
      "href",
      "https://switchcv.com/test-slug"
    );
  });

  it("should show logout button", () => {
    render(<Dashboard />);

    expect(screen.getByText("Logout")).toBeInTheDocument();
  });

  it("should show dashboard stats cards", () => {
    render(<Dashboard />);

    expect(screen.getByText("Resume Status")).toBeInTheDocument();
    expect(screen.getByText("Profile Views")).toBeInTheDocument();
    expect(screen.getByText("Contact Requests")).toBeInTheDocument();
  });

  it("should show quality metrics", () => {
    render(<Dashboard />);

    expect(screen.getByText("Resume Quality")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });
});
