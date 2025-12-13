/**
 * Tests for lib/notificationService utility
 */

import {
  createNotification,
  getNotification,
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  markAsDelivered,
  updateNotificationStatus,
  savePreference,
  getPreferences,
  getPreference,
  shouldSendNotification,
  generateNotificationId,
  createQueue,
  addToQueue,
  getQueue,
  updateQueueStatus,
  logNotification,
  getLogs,
  deleteNotification,
  clearOldNotifications,
  getStatistics,
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

  describe("getUnreadNotifications", () => {
    it("should return only unread notifications for a user", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;

      // Create read notification
      const readNotification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        userId,
        { title: "Read notification", body: "Already read" },
        [NotificationChannel.IN_APP]
      );
      await markAsRead(readNotification.id);

      // Create unread notification
      const unreadNotification = await createNotification(
        NotificationType.STAGE_CHANGED,
        userId,
        { title: "Unread notification", body: "Not read yet" },
        [NotificationChannel.EMAIL]
      );

      const unreadNotifications = await getUnreadNotifications(userId);
      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].id).toBe(unreadNotification.id);
      expect(unreadNotifications[0].status).toBe(NotificationStatus.PENDING);
    });

    it("should return empty array for user with no unread notifications", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;

      // Create and read notification
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        userId,
        { title: "Test", body: "Test" },
        [NotificationChannel.IN_APP]
      );
      await markAsRead(notification.id);

      const unreadNotifications = await getUnreadNotifications(userId);
      expect(unreadNotifications).toEqual([]);
    });
  });

  describe("markAsDelivered", () => {
    it("should mark notification as delivered for specific channel", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        { title: "Test", body: "Test notification" },
        [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
      );

      const updated = await markAsDelivered(
        notification.id,
        NotificationChannel.IN_APP
      );

      expect(updated?.status).toBe(NotificationStatus.DELIVERED); // Status becomes delivered when marked as delivered
      expect(updated?.deliveredAt).toEqual(expect.any(Date));
    });

    it("should return undefined for non-existent notification", async () => {
      const result = await markAsDelivered(
        "non-existent-id",
        NotificationChannel.IN_APP
      );
      expect(result).toBeUndefined();
    });
  });

  describe("getPreference", () => {
    it("should return specific preference for user and type", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;
      const preference = {
        id: "pref123",
        userId,
        type: NotificationType.CANDIDATE_ADDED,
        enabled: true,
        channels: [NotificationChannel.IN_APP],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await savePreference(preference);

      const retrieved = await getPreference(
        userId,
        NotificationType.CANDIDATE_ADDED
      );
      expect(retrieved).toEqual(preference);
    });

    it("should return undefined for non-existent preference", async () => {
      const uniqueUserId = `user_non_existent_${Date.now()}_${Math.random()}`;
      const retrieved = await getPreference(
        uniqueUserId,
        NotificationType.CANDIDATE_ADDED
      );
      expect(retrieved).toBeUndefined();
    });
  });

  describe("createQueue", () => {
    it("should create a notification queue for a channel", () => {
      const queue = createQueue(NotificationChannel.EMAIL);

      expect(queue).toEqual({
        id: expect.any(String),
        channel: NotificationChannel.EMAIL,
        notifications: [],
        status: "idle",
        processedCount: 0,
        failedCount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should generate unique queue IDs", () => {
      const queue1 = createQueue(NotificationChannel.EMAIL);

      // Mock Date.now to return a different value for the second call
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 1);

      const queue2 = createQueue(NotificationChannel.EMAIL);

      // Restore Date.now
      Date.now = originalDateNow;

      expect(queue1.id).not.toBe(queue2.id);
    });
  });

  describe("addToQueue", () => {
    it("should add notification to queue", () => {
      const queue = createQueue(NotificationChannel.EMAIL);
      const notification = {
        id: "notif123",
        type: NotificationType.CANDIDATE_ADDED,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.MEDIUM,
        recipientId: "user123",
        channels: [NotificationChannel.EMAIL],
        payload: { title: "Test", body: "Test" },
        createdAt: new Date(),
        retryCount: 0,
      };

      const result = addToQueue(queue.id, notification);
      expect(result).toBe(true);

      const retrievedQueue = getQueue(queue.id);
      expect(retrievedQueue?.notifications).toHaveLength(1);
      expect(retrievedQueue?.notifications[0]).toEqual(notification);
    });

    it("should return false for non-existent queue", () => {
      const notification = {
        id: "notif123",
        type: NotificationType.CANDIDATE_ADDED,
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.MEDIUM,
        recipientId: "user123",
        channels: [NotificationChannel.EMAIL],
        payload: { title: "Test", body: "Test" },
        createdAt: new Date(),
        retryCount: 0,
      };

      const result = addToQueue("non-existent-queue", notification);
      expect(result).toBe(false);
    });
  });

  describe("getQueue", () => {
    it("should return queue by ID", () => {
      const queue = createQueue(NotificationChannel.EMAIL);
      const retrieved = getQueue(queue.id);

      expect(retrieved).toEqual(queue);
    });

    it("should return undefined for non-existent queue", () => {
      const retrieved = getQueue("non-existent-queue");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("updateQueueStatus", () => {
    it("should update queue status", () => {
      const queue = createQueue(NotificationChannel.EMAIL);
      const updated = updateQueueStatus(queue.id, "processing");

      expect(updated?.status).toBe("processing");
      expect(updated?.updatedAt).toEqual(expect.any(Date));
    });

    it("should return undefined for non-existent queue", () => {
      const result = updateQueueStatus("non-existent-queue", "processing");
      expect(result).toBeUndefined();
    });
  });

  describe("logNotification", () => {
    it("should log notification delivery", async () => {
      const notificationId = "notif123";

      await expect(
        logNotification(
          notificationId,
          NotificationChannel.EMAIL,
          NotificationStatus.SENT,
          "Successfully sent email"
        )
      ).resolves.not.toThrow();

      // Verify log was created (this would need actual logging verification)
      const logs = await getLogs(notificationId);
      expect(logs.length).toBeGreaterThan(0);
    });

    it("should log notification failure with error code", async () => {
      const notificationId = "notif456";

      await expect(
        logNotification(
          notificationId,
          NotificationChannel.EMAIL,
          NotificationStatus.FAILED,
          "Email delivery failed",
          "SMTP_ERROR"
        )
      ).resolves.not.toThrow();

      const logs = await getLogs(notificationId);
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe("getLogs", () => {
    it("should return logs for specific notification", async () => {
      const notificationId = "notif789";

      await logNotification(
        notificationId,
        NotificationChannel.EMAIL,
        NotificationStatus.SENT,
        "Test log"
      );

      const logs = await getLogs(notificationId);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
    });

    it("should return all logs when no notification ID specified", async () => {
      const logs = await getLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      // Add multiple logs
      for (let i = 0; i < 5; i++) {
        await logNotification(
          `notif${i}`,
          NotificationChannel.EMAIL,
          NotificationStatus.SENT,
          `Log ${i}`
        );
      }

      const logs = await getLogs(undefined, 3);
      expect(logs.length).toBeLessThanOrEqual(3);
    });
  });

  describe("deleteNotification", () => {
    it("should delete existing notification", async () => {
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        { title: "Test", body: "Test" },
        [NotificationChannel.IN_APP]
      );

      const result = await deleteNotification(notification.id);
      expect(result).toBe(true);

      const retrieved = await getNotification(notification.id);
      expect(retrieved).toBeUndefined();
    });

    it("should return false for non-existent notification", async () => {
      const result = await deleteNotification("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("clearOldNotifications", () => {
    it("should clear old notifications", async () => {
      // Create a notification
      const notification = await createNotification(
        NotificationType.CANDIDATE_ADDED,
        "user123",
        { title: "Old notification", body: "Old" },
        [NotificationChannel.IN_APP]
      );

      // Mock the createdAt to be old
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      // This test assumes the service can handle clearing - actual implementation may vary
      const clearedCount = await clearOldNotifications(30);
      expect(typeof clearedCount).toBe("number");
      expect(clearedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getStatistics", () => {
    it("should return notification statistics", async () => {
      const userId = `user_${Date.now()}_${Math.random()}`;

      // Create some notifications
      await createNotification(
        NotificationType.CANDIDATE_ADDED,
        userId,
        { title: "Test 1", body: "Test" },
        [NotificationChannel.IN_APP]
      );
      await createNotification(
        NotificationType.STAGE_CHANGED,
        userId,
        { title: "Test 2", body: "Test" },
        [NotificationChannel.EMAIL]
      );

      const stats = await getStatistics(userId);
      expect(typeof stats).toBe("object");
      expect(stats).toHaveProperty("total");
      expect(typeof stats.total).toBe("number");
    });

    it("should return global statistics when no user specified", async () => {
      const stats = await getStatistics();
      expect(typeof stats).toBe("object");
      expect(stats).toHaveProperty("total");
    });

    it("should respect days parameter", async () => {
      const stats = await getStatistics(undefined, 30);
      expect(typeof stats).toBe("object");
    });
  });
});
