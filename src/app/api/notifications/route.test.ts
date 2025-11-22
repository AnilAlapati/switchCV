/* eslint-disable max-lines */

import { NextRequest } from "next/server";
import { POST, GET } from "./route";

// Mock notification service functions
jest.mock("@/lib/notificationService", () => ({
  createNotification: jest.fn(),
  getUserNotifications: jest.fn(),
  getUnreadNotifications: jest.fn(),
  markAsRead: jest.fn(),
  getPreferences: jest.fn(),
  savePreference: jest.fn(),
  getStatistics: jest.fn(),
  deleteNotification: jest.fn(),
  generateNotificationId: jest.fn(),
}));

// Mock notification delivery functions
jest.mock("@/lib/notificationDelivery", () => ({
  sendMultiChannel: jest.fn(),
  getDeliveryStatus: jest.fn(),
}));

import {
  createNotification,
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  getPreferences,
  savePreference,
  getStatistics,
  deleteNotification,
  generateNotificationId,
} from "@/lib/notificationService";

import {
  sendMultiChannel,
  getDeliveryStatus,
} from "@/lib/notificationDelivery";

import {
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
} from "@/lib/notifications.types";

const mockCreateNotification = createNotification as jest.MockedFunction<
  typeof createNotification
>;
const mockGetUserNotifications = getUserNotifications as jest.MockedFunction<
  typeof getUserNotifications
>;
const mockGetUnreadNotifications =
  getUnreadNotifications as jest.MockedFunction<typeof getUnreadNotifications>;
const mockMarkAsRead = markAsRead as jest.MockedFunction<typeof markAsRead>;
const mockGetPreferences = getPreferences as jest.MockedFunction<
  typeof getPreferences
>;
const mockSavePreference = savePreference as jest.MockedFunction<
  typeof savePreference
>;
const mockGetStatistics = getStatistics as jest.MockedFunction<
  typeof getStatistics
>;
const mockDeleteNotification = deleteNotification as jest.MockedFunction<
  typeof deleteNotification
>;
const mockGenerateNotificationId =
  generateNotificationId as jest.MockedFunction<typeof generateNotificationId>;
const mockSendMultiChannel = sendMultiChannel as jest.MockedFunction<
  typeof sendMultiChannel
>;
const mockGetDeliveryStatus = getDeliveryStatus as jest.MockedFunction<
  typeof getDeliveryStatus
>;

describe("POST /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockNotification = {
    id: "notif-123",
    type: NotificationType.CANDIDATE_ADDED,
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.MEDIUM,
    recipientId: "user123",
    channels: [NotificationChannel.EMAIL],
    payload: {
      title: "Test Notification",
      body: "Test notification",
      data: { message: "Test notification" },
    },
    createdAt: new Date(),
    retryCount: 0,
  };

  const mockPreference = {
    id: "pref-123",
    userId: "user123",
    type: NotificationType.CANDIDATE_ADDED,
    channels: [NotificationChannel.EMAIL],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("send action", () => {
    it("should send notification successfully", async () => {
      const mockNotification = {
        id: "notif-123",
        type: NotificationType.CANDIDATE_ADDED,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.MEDIUM,
        recipientId: "user123",
        channels: [NotificationChannel.EMAIL],
        payload: {
          title: "Test Notification",
          body: "Test notification",
          data: { message: "Test notification" },
        },
        createdAt: new Date(),
        retryCount: 0,
      };

      const mockDeliveryResults = {
        email: true,
        sms: false,
        push: false,
        webhook: true,
      };

      mockCreateNotification.mockResolvedValue(mockNotification);
      mockSendMultiChannel.mockResolvedValue(mockDeliveryResults);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "send",
            userId: "user123",
            data: {
              type: "info",
              payload: { message: "Test notification" },
              channels: ["email"],
              priority: "medium",
              email: "test@example.com",
            },
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        notification: {
          ...mockNotification,
          createdAt: mockNotification.createdAt.toISOString(),
        },
        deliveryResults: mockDeliveryResults,
      });
      expect(mockCreateNotification).toHaveBeenCalledWith(
        "info",
        "user123",
        { message: "Test notification" },
        ["email"],
        "medium"
      );
      expect(mockSendMultiChannel).toHaveBeenCalledWith(mockNotification, {
        email: "test@example.com",
        phone: undefined,
        pushToken: undefined,
        webhookUrl: undefined,
      });
    });

    it("should return 400 for missing required fields", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "send",
            userId: "user123",
            data: {
              type: "info",
              // missing payload and channels
            },
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing required fields" });
      expect(mockCreateNotification).not.toHaveBeenCalled();
      expect(mockSendMultiChannel).not.toHaveBeenCalled();
    });
  });

  describe("mark-read action", () => {
    it("should mark notification as read", async () => {
      mockMarkAsRead.mockResolvedValue(mockNotification);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "mark-read",
            data: { notificationId: "notif-123" },
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockMarkAsRead).toHaveBeenCalledWith("notif-123");
    });

    it("should return 400 for missing notificationId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "mark-read",
            data: {},
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing notificationId" });
      expect(mockMarkAsRead).not.toHaveBeenCalled();
    });
  });

  describe("mark-all-read action", () => {
    it("should mark all notifications as read", async () => {
      const mockUnreadNotifications = [
        {
          id: "notif-1",
          type: NotificationType.CANDIDATE_ADDED,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          recipientId: "user123",
          channels: [NotificationChannel.EMAIL],
          payload: {
            title: "Test",
            body: "Test",
          },
          createdAt: new Date(),
          retryCount: 0,
        },
        {
          id: "notif-2",
          type: NotificationType.CANDIDATE_ADDED,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          recipientId: "user123",
          channels: [NotificationChannel.EMAIL],
          payload: {
            title: "Test",
            body: "Test",
          },
          createdAt: new Date(),
          retryCount: 0,
        },
      ];

      mockGetUnreadNotifications.mockResolvedValue(mockUnreadNotifications);
      mockMarkAsRead.mockResolvedValue(mockNotification);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "mark-all-read",
            userId: "user123",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, markedCount: 2 });
      expect(mockGetUnreadNotifications).toHaveBeenCalledWith("user123");
      expect(mockMarkAsRead).toHaveBeenCalledTimes(2);
      expect(mockMarkAsRead).toHaveBeenCalledWith("notif-1");
      expect(mockMarkAsRead).toHaveBeenCalledWith("notif-2");
    });

    it("should return 400 for missing userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "mark-all-read",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing userId" });
      expect(mockGetUnreadNotifications).not.toHaveBeenCalled();
    });
  });

  describe("delete action", () => {
    it("should delete notification", async () => {
      mockDeleteNotification.mockResolvedValue(true);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            data: { notificationId: "notif-123" },
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockDeleteNotification).toHaveBeenCalledWith("notif-123");
    });

    it("should return 400 for missing notificationId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            data: {},
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing notificationId" });
      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });
  });

  describe("get-preferences action", () => {
    it("should get user preferences", async () => {
      mockGetPreferences.mockResolvedValue([mockPreference]);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "get-preferences",
            userId: "user123",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        preferences: [
          {
            ...mockPreference,
            createdAt: mockPreference.createdAt.toISOString(),
            updatedAt: mockPreference.updatedAt.toISOString(),
          },
        ],
      });
      expect(mockGetPreferences).toHaveBeenCalledWith("user123");
    });

    it("should return 400 for missing userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "get-preferences",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing userId" });
      expect(mockGetPreferences).not.toHaveBeenCalled();
    });
  });

  describe("update-preference action", () => {
    it("should update user preference", async () => {
      const preference = {
        channel: "email",
        enabled: false,
      };

      mockGenerateNotificationId.mockReturnValue("pref-123");
      mockSavePreference.mockResolvedValue(mockPreference);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "update-preference",
            userId: "user123",
            data: { preference },
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.preference.userId).toBe("user123");
      expect(data.preference.channel).toBe("email");
      expect(data.preference.enabled).toBe(false);
      expect(data.preference.id).toBe("pref_pref-123");
      expect(mockSavePreference).toHaveBeenCalled();
    });

    it("should return 400 for missing fields", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "update-preference",
            userId: "user123",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing required fields" });
      expect(mockSavePreference).not.toHaveBeenCalled();
    });
  });

  describe("get-delivery-status action", () => {
    it("should get delivery status", async () => {
      const mockStatus = {
        email: true,
        sms: false,
        push: false,
        webhook: true,
      };

      mockGetDeliveryStatus.mockReturnValue(mockStatus);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "get-delivery-status",
            data: { notificationId: "notif-123" },
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        status: mockStatus,
      });
      expect(mockGetDeliveryStatus).toHaveBeenCalledWith("notif-123");
    });

    it("should return 400 for missing notificationId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications",
        {
          method: "POST",
          body: JSON.stringify({
            action: "get-delivery-status",
            data: {},
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing notificationId" });
      expect(mockGetDeliveryStatus).not.toHaveBeenCalled();
    });
  });

  it("should return 400 for unknown action", async () => {
    const request = new NextRequest("http://localhost:3000/api/notifications", {
      method: "POST",
      body: JSON.stringify({
        action: "unknown-action",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Unknown action" });
  });

  it("should handle JSON parsing errors", async () => {
    const request = new NextRequest("http://localhost:3000/api/notifications", {
      method: "POST",
      body: "invalid json",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Unknown action");
  });
});

describe("GET /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("get-notifications action", () => {
    it("should get user notifications", async () => {
      const mockNotifications = [
        {
          id: "notif-1",
          type: NotificationType.CANDIDATE_ADDED,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          recipientId: "user123",
          channels: [NotificationChannel.EMAIL],
          payload: {
            title: "Test",
            body: "Test",
          },
          createdAt: new Date(),
          retryCount: 0,
        },
        {
          id: "notif-2",
          type: NotificationType.CANDIDATE_ADDED,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          recipientId: "user123",
          channels: [NotificationChannel.EMAIL],
          payload: {
            title: "Test",
            body: "Test",
          },
          createdAt: new Date(),
          retryCount: 0,
        },
      ];

      mockGetUserNotifications.mockResolvedValue(mockNotifications);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-notifications&userId=user123"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        notifications: mockNotifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        count: 2,
      });
      expect(mockGetUserNotifications).toHaveBeenCalledWith("user123");
    });

    it("should return 400 for missing userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-notifications"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing userId" });
      expect(mockGetUserNotifications).not.toHaveBeenCalled();
    });
  });

  describe("get-unread action", () => {
    it("should get unread notifications", async () => {
      const mockUnreadNotifications = [
        {
          id: "notif-1",
          type: NotificationType.CANDIDATE_ADDED,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.MEDIUM,
          recipientId: "user123",
          channels: [NotificationChannel.EMAIL],
          payload: {
            title: "Test",
            body: "Test",
          },
          createdAt: new Date(),
          retryCount: 0,
        },
      ];

      mockGetUnreadNotifications.mockResolvedValue(mockUnreadNotifications);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-unread&userId=user123"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        notifications: mockUnreadNotifications.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        count: 1,
      });
      expect(mockGetUnreadNotifications).toHaveBeenCalledWith("user123");
    });

    it("should return 400 for missing userId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-unread"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing userId" });
      expect(mockGetUnreadNotifications).not.toHaveBeenCalled();
    });
  });

  describe("get-statistics action", () => {
    it("should get notification statistics", async () => {
      const mockStats = {
        total: 10,
        unread: 3,
        read: 7,
      };

      mockGetStatistics.mockResolvedValue(mockStats);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-statistics&userId=user123"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        statistics: mockStats,
      });
      expect(mockGetStatistics).toHaveBeenCalledWith("user123");
    });

    it("should get statistics without userId", async () => {
      const mockStats = {
        total: 100,
        unread: 25,
        read: 75,
      };

      mockGetStatistics.mockResolvedValue(mockStats);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-statistics"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        statistics: mockStats,
      });
      expect(mockGetStatistics).toHaveBeenCalledWith(undefined);
    });
  });

  describe("get-delivery-status action", () => {
    it("should get delivery status", async () => {
      const mockStatus = {
        email: true,
        sms: false,
        push: false,
        webhook: true,
      };

      mockGetDeliveryStatus.mockReturnValue(mockStatus);

      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-delivery-status&notificationId=notif-123"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        status: mockStatus,
      });
      expect(mockGetDeliveryStatus).toHaveBeenCalledWith("notif-123");
    });

    it("should return 400 for missing notificationId", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/notifications?action=get-delivery-status"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: "Missing notificationId" });
      expect(mockGetDeliveryStatus).not.toHaveBeenCalled();
    });
  });

  it("should return 400 for unknown action", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/notifications?action=unknown-action"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Unknown action" });
  });
});
