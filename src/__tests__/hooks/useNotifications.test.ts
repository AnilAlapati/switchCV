import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "../../hooks/useNotifications";
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from "@/lib/notifications.types";
import * as notificationService from "@/lib/notificationService";
import * as notificationDelivery from "@/lib/notificationDelivery";

// Mock dependencies
jest.mock("@/lib/notificationService");
jest.mock("@/lib/notificationDelivery");

describe("useNotifications", () => {
  const mockUserId = "test-user-id";
  const mockNotifications = [
    {
      id: "notif1",
      type: NotificationType.MESSAGE_RECEIVED,
      status: NotificationStatus.PENDING,
      priority: NotificationPriority.MEDIUM,
      recipientId: mockUserId,
      channels: [NotificationChannel.IN_APP],
      payload: { title: "Test", body: "Body" },
      createdAt: new Date(),
      retryCount: 0,
    },
  ];
  const mockPreferences = [
    {
      id: "pref1",
      userId: mockUserId,
      type: NotificationType.MESSAGE_RECEIVED,
      channels: [NotificationChannel.IN_APP],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const mockStats = { sent: 10, read: 5 };

  beforeEach(() => {
    jest.clearAllMocks();
    (notificationService.getUserNotifications as jest.Mock).mockResolvedValue(
      mockNotifications
    );
    (notificationService.getPreferences as jest.Mock).mockResolvedValue(
      mockPreferences
    );
    (notificationService.getStatistics as jest.Mock).mockResolvedValue(mockStats);
    (notificationService.shouldSendNotification as jest.Mock).mockResolvedValue(
      true
    );
    (notificationService.createNotification as jest.Mock).mockImplementation(
      async (type, userId, payload, channels, priority) => ({
        id: "new-notif",
        type,
        recipientId: userId,
        payload,
        channels,
        priority,
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        retryCount: 0,
      })
    );
    (notificationDelivery.sendMultiChannel as jest.Mock).mockResolvedValue(
      undefined
    );
    (notificationService.markAsRead as jest.Mock).mockResolvedValue(undefined);
    (notificationService.savePreference as jest.Mock).mockResolvedValue(undefined);
    (notificationService.deleteNotification as jest.Mock).mockResolvedValue(true);
  });

  it("should load state when refreshNotifications is called", async () => {
    const { result } = renderHook(() => useNotifications(mockUserId));

    await act(async () => {
      await result.current.refreshNotifications();
    });

    expect(result.current.notifications).toEqual(mockNotifications);
    expect(result.current.preferences).toEqual(mockPreferences);
    expect(result.current.statistics).toEqual(mockStats);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle load error", async () => {
    (notificationService.getUserNotifications as jest.Mock).mockRejectedValue(
      new Error("Load failed")
    );

    const { result } = renderHook(() => useNotifications(mockUserId));

    await act(async () => {
      await result.current.refreshNotifications();
    });

    expect(result.current.error).toContain("Failed to load notifications");
    expect(result.current.loading).toBe(false);
  });

  it("should send notification successfully", async () => {
    const { result } = renderHook(() => useNotifications(mockUserId));

    await act(async () => {
      const notif = await result.current.sendNotification(
        NotificationType.MESSAGE_RECEIVED,
        { title: "New Msg", body: "Hello" },
        [NotificationChannel.IN_APP]
      );
      expect(notif).toBeDefined();
      expect(notif?.id).toBe("new-notif");
    });

    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(notificationDelivery.sendMultiChannel).toHaveBeenCalled();
    // Should refresh notifications after sending
    expect(notificationService.getUserNotifications).toHaveBeenCalledTimes(1); // Refresh only
  });

  it("should handle send notification error", async () => {
    (notificationDelivery.sendMultiChannel as jest.Mock).mockRejectedValue(
      new Error("Send failed")
    );

    const { result } = renderHook(() => useNotifications(mockUserId));

    await act(async () => {
      const notif = await result.current.sendNotification(
        NotificationType.MESSAGE_RECEIVED,
        { title: "New Msg", body: "Hello" },
        [NotificationChannel.IN_APP]
      );
      expect(notif).toBeNull();
    });

    expect(result.current.error).toContain("Failed to send notification");
  });

  it("should mark notification as read", async () => {
    const { result } = renderHook(() => useNotifications(mockUserId));

    await act(async () => {
      await result.current.markRead("notif1");
    });

    expect(notificationService.markAsRead).toHaveBeenCalledWith("notif1");
    expect(notificationService.getUserNotifications).toHaveBeenCalledTimes(1);
  });

  it("should mark all as read", async () => {
    (notificationService.getUnreadNotifications as jest.Mock).mockResolvedValue(
      mockNotifications
    );
    const { result } = renderHook(() => useNotifications(mockUserId));

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(notificationService.markAsRead).toHaveBeenCalledWith("notif1");
    expect(notificationService.getUserNotifications).toHaveBeenCalledTimes(1);
  });

  it("should delete notification", async () => {
    const { result } = renderHook(() => useNotifications(mockUserId));

    // Initial load
    await act(async () => {
      await result.current.refreshNotifications();
    });
    expect(result.current.notifications).toHaveLength(1);

    // Mock getUserNotifications to return empty after delete
    (notificationService.getUserNotifications as jest.Mock).mockResolvedValue([]);

    await act(async () => {
      await result.current.deleteNotification("notif1");
    });

    expect(notificationService.deleteNotification).toHaveBeenCalledWith("notif1");
    expect(result.current.notifications).toHaveLength(0);
  });

  it("should update preference", async () => {
    const { result } = renderHook(() => useNotifications(mockUserId));
    const newPref = { ...mockPreferences[0], enabled: false };

    // Initial load
    await act(async () => {
      await result.current.refreshNotifications();
    });

    await act(async () => {
      await result.current.updatePreference(newPref);
    });

    expect(notificationService.savePreference).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    expect(result.current.preferences[0].enabled).toBe(false);
  });
});
