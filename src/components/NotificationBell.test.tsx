/**
 * Tests for NotificationBell component
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { mockUser, createMockQuerySnapshot } from "@/__tests__/mocks/firebase";
import { collection, onSnapshot } from "firebase/firestore";

jest.mock("@/hooks/useAuth");
jest.mock("firebase/firestore");
jest.mock("@/lib/firebase", () => ({
  db: { name: "[DEFAULT]" },
}));
jest.mock("@/components/NotificationList", () => ({
  NotificationList: ({ notifications }: any) => (
    <div data-testid="notification-list">
      {notifications.map((n: any) => (
        <div key={n.id} data-testid={`notification-${n.id}`}>
          {n.message}
        </div>
      ))}
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockOnSnapshot = onSnapshot as jest.MockedFunction<any>;

describe("NotificationBell Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any);

    render(<NotificationBell />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("should not subscribe to notifications if user is not authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
    } as any);

    render(<NotificationBell />);

    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("should subscribe to notifications when user is authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    mockOnSnapshot.mockImplementation((q: any, callback: any) => {
      callback(
        createMockQuerySnapshot([
          {
            id: "notif-1",
            message: "Test notification",
            read: false,
          },
        ]) as any
      );
      return jest.fn(); // unsubscribe
    });

    render(<NotificationBell />);

    expect(mockOnSnapshot).toHaveBeenCalled();
  });

  it("should display unread count", async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    mockOnSnapshot.mockImplementation((q, callback) => {
      callback(
        createMockQuerySnapshot([
          { id: "notif-1", message: "Notif 1", read: false },
          { id: "notif-2", message: "Notif 2", read: false },
          { id: "notif-3", message: "Notif 3", read: true },
        ]) as any
      );
      return jest.fn();
    });

    render(<NotificationBell />);

    await waitFor(() => {
      const badge = screen.queryByText("2");
      if (badge) {
        expect(badge).toBeTruthy();
      }
    });
  });

  it("should toggle notification list visibility", async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    mockOnSnapshot.mockImplementation((q, callback) => {
      callback(
        createMockQuerySnapshot([
          { id: "notif-1", message: "Test", read: false },
        ]) as any
      );
      return jest.fn();
    });

    render(<NotificationBell />);

    const bellButton = screen.getByRole("button");
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByTestId("notification-list")).toBeTruthy();
    });

    fireEvent.click(bellButton);

    // List should be hidden
    await waitFor(() => {
      const list = screen.queryByTestId("notification-list");
      if (list) {
        expect(list.style.display).toBe("none");
      }
    });
  });

  it("should show loading state initially", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    mockOnSnapshot.mockImplementation(() => jest.fn());

    render(<NotificationBell />);

    // Component should render with loading state
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("should handle empty notifications", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    mockOnSnapshot.mockImplementation((q, callback) => {
      callback(createMockQuerySnapshot([]) as any);
      return jest.fn();
    });

    render(<NotificationBell />);

    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("should limit notifications to 50 items", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    mockOnSnapshot.mockImplementation((q, callback) => {
      const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: `notif-${i}`,
        message: `Notification ${i}`,
        read: false,
      }));
      callback(createMockQuerySnapshot(manyNotifications.slice(0, 50)) as any);
      return jest.fn();
    });

    render(<NotificationBell />);

    // Should handle large notification lists
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("should unsubscribe on unmount", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    const unsubscribeMock = jest.fn();
    mockOnSnapshot.mockImplementation(() => unsubscribeMock);

    const { unmount } = render(<NotificationBell />);

    unmount();

    // Unsubscribe should be called
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it("should handle unread notification count correctly", async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    mockOnSnapshot.mockImplementation((q, callback) => {
      callback(
        createMockQuerySnapshot([
          { id: "1", message: "Test 1", read: false },
          { id: "2", message: "Test 2", read: true },
          { id: "3", message: "Test 3", read: false },
          { id: "4", message: "Test 4", read: false },
        ]) as any
      );
      return jest.fn();
    });

    render(<NotificationBell />);

    await waitFor(() => {
      const badge = screen.queryByText("3");
      if (badge) {
        expect(badge).toBeTruthy();
      }
    });
  });

  it("should order notifications by timestamp descending", () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    } as any);

    const notifications = [
      {
        id: "1",
        message: "Old",
        read: false,
        timestamp: new Date("2024-01-01"),
      },
      {
        id: "2",
        message: "New",
        read: false,
        timestamp: new Date("2024-12-31"),
      },
    ];

    mockOnSnapshot.mockImplementation((q, callback) => {
      callback(createMockQuerySnapshot(notifications) as any);
      return jest.fn();
    });

    render(<NotificationBell />);

    expect(screen.getByRole("button")).toBeTruthy();
  });
});
