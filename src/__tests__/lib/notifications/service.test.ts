import { NotificationService } from "@/lib/notifications/service";
import { NotificationRepository } from "@/lib/notifications/repository";
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  Notification,
} from "@/lib/notifications.types";

// Mock Repository
const mockRepository: jest.Mocked<NotificationRepository> = {
  createNotification: jest.fn(),
  getNotification: jest.fn(),
  getUserNotifications: jest.fn(),
  updateNotification: jest.fn(),
  deleteNotification: jest.fn(),
  savePreference: jest.fn(),
  getPreferences: jest.fn(),
  logNotification: jest.fn(),
  getLogs: jest.fn(),
  deleteOlderThan: jest.fn(),
  getStatistics: jest.fn(),
};

describe("NotificationService", () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(mockRepository);
  });

  describe("createNotification", () => {
    it("creates a notification with correct defaults", async () => {
      const payload = { title: "Test", body: "Body" };
      const notification: Notification = {
        id: "test-id",
        type: NotificationType.PROFILE_VIEW,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.MEDIUM,
        recipientId: "user-1",
        channels: [NotificationChannel.IN_APP],
        payload,
        createdAt: expect.any(Date),
        retryCount: 0,
      };

      mockRepository.createNotification.mockResolvedValue(notification);

      const result = await service.createNotification(
        NotificationType.PROFILE_VIEW,
        "user-1",
        payload,
        [NotificationChannel.IN_APP],
      );

      expect(mockRepository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.PROFILE_VIEW,
          recipientId: "user-1",
          priority: NotificationPriority.MEDIUM,
        }),
      );
      expect(result).toEqual(notification);
    });
  });

  describe("getUnreadNotifications", () => {
    it("filters unread notifications", async () => {
      const notifications: Notification[] = [
        { id: "1", status: NotificationStatus.READ } as any,
        { id: "2", status: NotificationStatus.PENDING } as any,
        { id: "3", status: NotificationStatus.DELIVERED } as any,
      ];
      mockRepository.getUserNotifications.mockResolvedValue(notifications);

      const result = await service.getUnreadNotifications("user-1");
      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id)).toEqual(["2", "3"]);
    });
  });

  describe("markAsRead", () => {
    it("updates status to READ", async () => {
      const notification = {
        id: "1",
        status: NotificationStatus.DELIVERED,
      } as any;
      mockRepository.getNotification.mockResolvedValue(notification);
      mockRepository.updateNotification.mockImplementation(async (n) => n);

      await service.markAsRead("1");

      expect(mockRepository.updateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          status: NotificationStatus.READ,
          readAt: expect.any(Date),
        }),
      );
    });

    it("returns undefined if notification not found", async () => {
      mockRepository.getNotification.mockResolvedValue(undefined);
      const result = await service.markAsRead("1");
      expect(result).toBeUndefined();
    });
  });

  describe("markAsDelivered", () => {
    it("updates status to DELIVERED and logs", async () => {
      const notification = {
        id: "1",
        status: NotificationStatus.PENDING,
      } as any;
      mockRepository.getNotification.mockResolvedValue(notification);
      mockRepository.updateNotification.mockImplementation(async (n) => n);

      await service.markAsDelivered("1", NotificationChannel.EMAIL);

      expect(mockRepository.updateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "1",
          status: NotificationStatus.DELIVERED,
          deliveredAt: expect.any(Date),
        }),
      );
      expect(mockRepository.logNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId: "1",
          status: NotificationStatus.DELIVERED,
          channel: NotificationChannel.EMAIL,
        }),
      );
    });
  });

  describe("updateNotificationStatus", () => {
    it("updates status and sets sentAt for SENT", async () => {
      const notification = { id: "1" } as any;
      mockRepository.getNotification.mockResolvedValue(notification);
      mockRepository.updateNotification.mockImplementation(async (n) => n);

      await service.updateNotificationStatus("1", NotificationStatus.SENT);

      expect(mockRepository.updateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
        }),
      );
    });
  });

  describe("shouldSendNotification", () => {
    it("returns false if preference not found", async () => {
      mockRepository.getPreferences.mockResolvedValue([]);
      const result = await service.shouldSendNotification(
        "user-1",
        NotificationType.PROFILE_VIEW,
        NotificationChannel.EMAIL,
      );
      expect(result).toBe(false);
    });

    it("returns false if preference disabled", async () => {
      mockRepository.getPreferences.mockResolvedValue([
        { type: NotificationType.PROFILE_VIEW, enabled: false } as any,
      ]);
      const result = await service.shouldSendNotification(
        "user-1",
        NotificationType.PROFILE_VIEW,
        NotificationChannel.EMAIL,
      );
      expect(result).toBe(false);
    });

    it("returns false if channel not enabled", async () => {
      mockRepository.getPreferences.mockResolvedValue([
        {
          type: NotificationType.PROFILE_VIEW,
          enabled: true,
          channels: [NotificationChannel.IN_APP],
        } as any,
      ]);
      const result = await service.shouldSendNotification(
        "user-1",
        NotificationType.PROFILE_VIEW,
        NotificationChannel.EMAIL,
      );
      expect(result).toBe(false);
    });

    it("returns false during quiet hours", async () => {
      // Mock Date to be inside quiet hours
      const mockDate = new Date("2023-01-01T14:00:00"); // 14:00
      jest.useFakeTimers().setSystemTime(mockDate.getTime());

      mockRepository.getPreferences.mockResolvedValue([
        {
          type: NotificationType.PROFILE_VIEW,
          enabled: true,
          channels: [NotificationChannel.EMAIL],
          quietHours: {
            enabled: true,
            startTime: "13:00",
            endTime: "15:00",
          },
        } as any,
      ]);

      const result = await service.shouldSendNotification(
        "user-1",
        NotificationType.PROFILE_VIEW,
        NotificationChannel.EMAIL,
      );
      expect(result).toBe(false);

      jest.useRealTimers();
    });

    it("returns true if outside quiet hours", async () => {
      const mockDate = new Date("2023-01-01T16:00:00"); // 16:00
      jest.useFakeTimers().setSystemTime(mockDate.getTime());

      mockRepository.getPreferences.mockResolvedValue([
        {
          type: NotificationType.PROFILE_VIEW,
          enabled: true,
          channels: [NotificationChannel.EMAIL],
          quietHours: {
            enabled: true,
            startTime: "13:00",
            endTime: "15:00",
          },
        } as any,
      ]);

      const result = await service.shouldSendNotification(
        "user-1",
        NotificationType.PROFILE_VIEW,
        NotificationChannel.EMAIL,
      );
      expect(result).toBe(true);

      jest.useRealTimers();
    });
  });

  describe("Queue Management", () => {
    it("creates and manages queues", () => {
      const queue = service.createQueue(NotificationChannel.EMAIL);
      expect(queue.channel).toBe(NotificationChannel.EMAIL);
      expect(service.getQueue(queue.id)).toBe(queue);

      const notification = { id: "1" } as any;
      service.addToQueue(queue.id, notification);
      expect(queue.notifications).toContain(notification);

      service.updateQueueStatus(queue.id, "processing");
      expect(queue.status).toBe("processing");
    });
  });

  describe("clearOldNotifications", () => {
    it("calls deleteOlderThan with correct date", async () => {
      const now = new Date("2023-02-01T00:00:00Z");
      jest.useFakeTimers().setSystemTime(now.getTime());

      await service.clearOldNotifications(30);

      const expectedDate = new Date("2023-01-02T00:00:00Z"); // 30 days ago
      expect(mockRepository.deleteOlderThan).toHaveBeenCalledWith(expectedDate);

      jest.useRealTimers();
    });
  });
});
