/**
 * Tests for lib/notificationService utility
 */

import {
  createNotification,
  getNotification,
  getUserNotifications,
  markAsRead,
  updateNotificationStatus,
  savePreference,
  getPreferences,
  shouldSendNotification,
  generateNotificationId,
} from "@/lib/notificationService";
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
} from "@/lib/notifications.types";

describe("Notification Service", () => {
  beforeEach(() => {
    // Clear all in-memory stores before each test
    jest.resetModules();
  });

  describe("generateNotificationId", () => {
    it("should generate a unique notification ID", () => {
      const id1 = generateNotificationId();
      const id2 = generateNotificationId();

      expect(id1).toMatch(/^notif_\d+_[\w]+$/);
      expect(id2).toMatch(/^notif_\d+_[\w]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe("createNotification", () => {
    it("should create a notification with all required fields", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        {
          title: "New candidate added",
          body: "A new candidate has been added to your pipeline",
          data: { candidateId: "candidate456" },
        },
        [NotificationChannel.IN_APP],
        NotificationPriority.MEDIUM
      );

      expect(notification).toEqual({
        id: expect.any(String),
        type: NotificationType.CANDIDATE_ADDED,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.MEDIUM,
        recipientId: "user123",
        channels: [NotificationChannel.IN_APP],
        payload: {
          title: "New candidate added",
          body: "A new candidate has been added to your pipeline",
          data: { candidateId: "candidate456" },
        },
        createdAt: expect.any(Date),
        retryCount: 0,
      });
    });

    it("should use default priority when not specified", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        {
          title: "New candidate added",
          body: "A new candidate has been added to your pipeline",
        },
        [NotificationChannel.IN_APP]
      );

      expect(notification.priority).toBe(NotificationPriority.MEDIUM);
    });
  });

  describe("getNotification", () => {
    it("should return notification by ID", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        {
          title: "New candidate",
          body: "Candidate added",
        },
        [NotificationChannel.IN_APP]
      );

      const retrieved = await getNotification(notification.id);
      expect(retrieved).toEqual(notification);
    });

    it("should return undefined for non-existent notification", async () => {
      const retrieved = await getNotification("non-existent-id");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("getUserNotifications", () => {
    it("should return all notifications for a user", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;
      await createNotification(
        NotificationType.CANDIDATE_ADDED,
        userId,
        { title: "Candidate 1", body: "Added" },
        [NotificationChannel.IN_APP]
      );
      await createNotification(
        NotificationType.STAGE_CHANGED,
        userId,
        { title: "Stage changed", body: "Updated" },
        [NotificationChannel.EMAIL]
      );
      await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "other_user",
        { title: "Other user", body: "Added" },
        [NotificationChannel.IN_APP]
      );

      const notifications = await getUserNotifications(userId);
      expect(notifications).toHaveLength(2);
      expect(notifications.every((n) => n.recipientId === userId)).toBe(true);
    });

    it("should return empty array for user with no notifications", async () => {
      const notifications = await getUserNotifications("non-existent-user");
      expect(notifications).toEqual([]);
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read and add readAt timestamp", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        { title: "Test", body: "Test notification" },
        [NotificationChannel.IN_APP]
      );

      const updated = await markAsRead(notification.id);

      expect(updated?.status).toBe(NotificationStatus.READ);
      expect(updated?.readAt).toEqual(expect.any(Date));
    });

    it("should return undefined for non-existent notification", async () => {
      const result = await markAsRead("non-existent-id");
      expect(result).toBeUndefined();
    });
  });

  describe("updateNotificationStatus", () => {
    it("should update notification status", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        { title: "Test", body: "Test notification" },
        [NotificationChannel.IN_APP]
      );

      const updated = await updateNotificationStatus(
        notification.id,
        NotificationStatus.SENT
      );

      expect(updated?.status).toBe(NotificationStatus.SENT);
      expect(updated?.sentAt).toEqual(expect.any(Date));
    });

    it("should include failure reason when provided", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        { title: "Test", body: "Test notification" },
        [NotificationChannel.IN_APP]
      );

      const updated = await updateNotificationStatus(
        notification.id,
        NotificationStatus.FAILED,
        "Delivery failed"
      );

      expect(updated?.status).toBe(NotificationStatus.FAILED);
      expect(updated?.failureReason).toBe("Delivery failed");
    });
  });

  describe("savePreference", () => {
    it("should save notification preference", async () => {
      const preference = {
        id: "pref123",
        userId: "user123",
        type: NotificationType.CANDIDATE_ADDED,
        enabled: true,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await savePreference(preference);
      expect(saved).toEqual(preference);
    });
  });

  describe("getPreferences", () => {
    it("should return all preferences for a user", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;
      const preference1 = {
        id: "pref1",
        userId,
        type: NotificationType.CANDIDATE_ADDED,
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const preference2 = {
        id: "pref2",
        userId,
        type: NotificationType.STAGE_CHANGED,
        enabled: false,
        channels: [NotificationChannel.EMAIL],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await savePreference(preference1);
      await savePreference(preference2);

      const preferences = await getPreferences(userId);
      expect(preferences).toHaveLength(2);
    });

    it("should return empty array for user with no preferences", async () => {
      const preferences = await getPreferences("non-existent-user");
      expect(preferences).toEqual([]);
    });
  });

  describe("shouldSendNotification", () => {
    it("should return true when preference allows notification", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;
      const preference = {
        id: "pref123",
        userId,
        type: NotificationType.CANDIDATE_ADDED,
        enabled: true,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await savePreference(preference);

      const shouldSend = await shouldSendNotification(
        userId,
        NotificationType.CANDIDATE_ADDED,
        NotificationChannel.IN_APP
      );
      expect(shouldSend).toBe(true);
    });

    it("should return false when preference is disabled", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;
      const preference = {
        id: "pref456",
        userId,
        type: NotificationType.CANDIDATE_ADDED,
        enabled: false,
        channels: [NotificationChannel.IN_APP],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await savePreference(preference);

      const shouldSend = await shouldSendNotification(
        userId,
        NotificationType.CANDIDATE_ADDED,
        NotificationChannel.IN_APP
      );
      expect(shouldSend).toBe(false);
    });

    it("should return false when no preference exists", async () => {
      const shouldSend = await shouldSendNotification(
        "user456",
        NotificationType.CANDIDATE_ADDED,
        NotificationChannel.IN_APP
      );
      expect(shouldSend).toBe(false);
    });
  });
});
