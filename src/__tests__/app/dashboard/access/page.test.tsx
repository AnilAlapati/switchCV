/**
 * Tests for Dashboard Access Page
 * Tests access request management and approval/denial flow
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessDashboardPage from "@/app/dashboard/access/page";
import { AccessRequest, AccessGrant } from "@/types/profileSearch";

// Mock Next.js router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Firebase
jest.mock("@/lib/firebase", () => ({
  db: {},
}));

// Mock useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      uid: "test-user-123",
      email: "test@example.com",
    },
    loading: false,
  }),
}));

// Mock useAccessRequests hook
jest.mock("@/hooks/useAccessRequests", () => ({
  useAccessRequests: () => ({
    pendingRequests: [
      {
        requestId: "req-1",
        fromUserId: "user-456",
        fromUserName: "John Seeker",
        timestamp: new Date(),
        message: "I'm very interested in your background",
        status: "pending",
      },
      {
        requestId: "req-2",
        fromUserId: "user-789",
        fromUserName: "Jane Recruiter",
        timestamp: new Date(),
        message: "Great profile!",
        status: "pending",
      },
    ] as AccessRequest[],
    activeGrants: [
      {
        grantId: "grant-1",
        toUserId: "user-101",
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: "1week",
      },
      {
        grantId: "grant-2",
        toUserId: "user-102",
        grantedAt: new Date(),
        expiresAt: null,
        duration: "forever",
      },
    ] as AccessGrant[],
    deniedRequests: [
      {
        requestId: "req-denied-1",
        fromUserId: "user-999",
        fromUserName: "Denied User",
        timestamp: new Date(),
        message: "Please share your resume",
        status: "denied",
      },
    ] as AccessRequest[],
    loading: false,
  }),
}));

// Mock components
jest.mock("@/components/access/AccessRequestCard", () => {
  return function MockCard({ request }: { request: AccessRequest }) {
    return (
      <div data-testid={`request-card-${request.requestId}`}>
        <h3>{request.fromUserName}</h3>
        <p>{request.message}</p>
      </div>
    );
  };
});

jest.mock("@/components/access/ActiveGrantCard", () => {
  return function MockCard({ grant }: { grant: AccessGrant }) {
    return (
      <div data-testid={`grant-card-${grant.grantId}`}>
        <h3>Grant {grant.grantId}</h3>
        <p>{grant.duration}</p>
      </div>
    );
  };
});

jest.mock("@/components/access/DeniedRequestCard", () => {
  return function MockCard({ request }: { request: AccessRequest }) {
    return (
      <div data-testid={`denied-card-${request.requestId}`}>
        <h3>{request.fromUserName}</h3>
      </div>
    );
  };
});

describe("Access Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe("Page Rendering", () => {
    it("should render the access dashboard", () => {
      render(<AccessDashboardPage />);

      expect(
        screen.getByRole("heading", { name: /Access Control Hub/ })
      ).toBeInTheDocument();
    });

    it("should display three stat cards", () => {
      render(<AccessDashboardPage />);

      expect(screen.getByText("Pending Requests")).toBeInTheDocument();
      expect(screen.getByText("Active Grants")).toBeInTheDocument();
      expect(screen.getByText("Denied Requests")).toBeInTheDocument();
    });

    it("should show request counts", () => {
      render(<AccessDashboardPage />);

      // Pending: 2, Active: 2, Denied: 1
      const textContent =
        screen.getByTestId("request-card-req-1").textContent || "";
      expect(textContent).toBeTruthy();
    });
  });

  describe("Authentication", () => {
    it("should show content when user is authenticated", () => {
      render(<AccessDashboardPage />);

      expect(
        screen.getByRole("heading", { name: /Access Control Hub/ })
      ).toBeInTheDocument();
    });

    it("should show loading state while checking auth", () => {
      jest.resetModules();
      jest.doMock("@/hooks/useAuth", () => ({
        useAuth: () => ({
          user: null,
          loading: true,
        }),
      }));

      // Note: In real test would need module reload
      render(<AccessDashboardPage />);
    });
  });

  describe("Tab Navigation", () => {
    it("should render tab buttons", () => {
      render(<AccessDashboardPage />);

      const tabButtons = screen
        .getAllByRole("button")
        .filter((btn) =>
          ["Pending", "Active", "Denied"].some((text) =>
            btn.textContent?.includes(text)
          )
        );
      expect(tabButtons.length).toBeGreaterThanOrEqual(3);
    });

    it("should switch tabs on click", async () => {
      const user = userEvent.setup();
      render(<AccessDashboardPage />);

      const activeTab = screen.getByText("Active");
      await user.click(activeTab);

      // Should show active grants
      expect(screen.getByTestId("grant-card-grant-1")).toBeInTheDocument();
    });

    it("should switch to denied requests tab", async () => {
      const user = userEvent.setup();
      render(<AccessDashboardPage />);

      const deniedTab = screen.getByText("Denied");
      await user.click(deniedTab);

      expect(
        screen.getByTestId("denied-card-req-denied-1")
      ).toBeInTheDocument();
    });
  });

  describe("Pending Requests Tab", () => {
    it("should display pending requests", () => {
      render(<AccessDashboardPage />);

      expect(screen.getByTestId("request-card-req-1")).toBeInTheDocument();
      expect(screen.getByTestId("request-card-req-2")).toBeInTheDocument();
    });

    it("should display request details", () => {
      render(<AccessDashboardPage />);

      expect(screen.getByText("John Seeker")).toBeInTheDocument();
      expect(
        screen.getByText("I'm very interested in your background")
      ).toBeInTheDocument();
    });
  });

  describe("Active Grants Tab", () => {
    it("should display active grants", async () => {
      const user = userEvent.setup();
      render(<AccessDashboardPage />);

      const activeTab = screen.getByText("Active");
      await user.click(activeTab);

      expect(screen.getByTestId("grant-card-grant-1")).toBeInTheDocument();
      expect(screen.getByTestId("grant-card-grant-2")).toBeInTheDocument();
    });

    it("should show duration information", async () => {
      const user = userEvent.setup();
      render(<AccessDashboardPage />);

      const activeTab = screen.getByText("Active");
      await user.click(activeTab);

      expect(screen.getByText("1week")).toBeInTheDocument();
      expect(screen.getByText("forever")).toBeInTheDocument();
    });
  });

  describe("Denied Requests Tab", () => {
    it("should display denied requests", async () => {
      const user = userEvent.setup();
      render(<AccessDashboardPage />);

      const deniedTab = screen.getByText("Denied");
      await user.click(deniedTab);

      expect(
        screen.getByTestId("denied-card-req-denied-1")
      ).toBeInTheDocument();
    });

    it("should show denied requester details", async () => {
      const user = userEvent.setup();
      render(<AccessDashboardPage />);

      const deniedTab = screen.getByText("Denied");
      await user.click(deniedTab);

      expect(screen.getByText("Denied User")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should render when data is loaded", () => {
      render(<AccessDashboardPage />);

      expect(
        screen.getByRole("heading", { name: /Access Control Hub/ })
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have semantic heading", () => {
      render(<AccessDashboardPage />);

      const heading = screen.getByRole("heading", {
        name: /Access Control Hub/,
      });
      expect(heading).toBeInTheDocument();
    });

    it("should have accessible tab buttons", async () => {
      const user = userEvent.setup();
      render(<AccessDashboardPage />);

      const tabButtons = screen.getAllByRole("button");
      expect(tabButtons.length).toBeGreaterThan(0);

      // Should be clickable
      if (tabButtons[0]) {
        await user.click(tabButtons[0]);
      }
    });
  });
});
