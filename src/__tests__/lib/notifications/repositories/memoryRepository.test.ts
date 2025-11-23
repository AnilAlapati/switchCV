import { MemoryNotificationRepository } from "@/lib/notifications/repositories/memoryRepository";
import {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationChannel,
  NotificationPreference,
} from "@/lib/notifications.types";

describe("MemoryNotificationRepository", () => {
  let repo: MemoryNotificationRepository;

  beforeEach(() => {
    repo = new MemoryNotificationRepository();
  });

  const mockNotification: Notification = {
    id: "1",
    type: NotificationType.PROFILE_VIEW,
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.MEDIUM,
    recipientId: "user-1",
    channels: [NotificationChannel.IN_APP],
    payload: { title: "Test", body: "Body" },
    createdAt: new Date(),
    retryCount: 0,
  };

  describe("Notification CRUD", () => {
    it("creates and retrieves notification", async () => {
      await repo.createNotification(mockNotification);
      const retrieved = await repo.getNotification("1");
      expect(retrieved).toEqual(mockNotification);
    });

    it("updates notification", async () => {
      await repo.createNotification(mockNotification);
      const updated = { ...mockNotification, status: NotificationStatus.READ };
      await repo.updateNotification(updated);
      const retrieved = await repo.getNotification("1");
      expect(retrieved?.status).toBe(NotificationStatus.READ);
    });

    it("deletes notification", async () => {
      await repo.createNotification(mockNotification);
      await repo.deleteNotification("1");
      const retrieved = await repo.getNotification("1");
      expect(retrieved).toBeUndefined();
    });

    it("gets user notifications sorted by date", async () => {
      const n1 = {
        ...mockNotification,
        id: "1",
        createdAt: new Date("2023-01-01"),
      };
      const n2 = {
        ...mockNotification,
        id: "2",
        createdAt: new Date("2023-01-02"),
      };
      await repo.createNotification(n1);
      await repo.createNotification(n2);

      const userNotifs = await repo.getUserNotifications("user-1");
      expect(userNotifs).toHaveLength(2);
      expect(userNotifs[0].id).toBe("2"); // Newer first
      expect(userNotifs[1].id).toBe("1");
    });
  });

  describe("Preferences", () => {
    it("saves and retrieves preferences", async () => {
      const pref: NotificationPreference = {
        id: "p1",
        userId: "user-1",
        type: NotificationType.PROFILE_VIEW,
        channels: [NotificationChannel.EMAIL],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repo.savePreference(pref);
      const prefs = await repo.getPreferences("user-1");
      expect(prefs).toHaveLength(1);
      expect(prefs[0]).toEqual(pref);
    });

    it("updates existing preference", async () => {
      const pref: NotificationPreference = {
        id: "p1",
        userId: "user-1",
        type: NotificationType.PROFILE_VIEW,
        channels: [NotificationChannel.EMAIL],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repo.savePreference(pref);

      const updatedPref = { ...pref, enabled: false };
      await repo.savePreference(updatedPref);

      const prefs = await repo.getPreferences("user-1");
      expect(prefs).toHaveLength(1);
      expect(prefs[0].enabled).toBe(false);
    });
  });

  describe("Logs", () => {
    it("logs and retrieves logs", async () => {
      const log = {
        id: "l1",
        notificationId: "1",
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT,
        message: "Sent",
        timestamp: new Date(),
      };

      await repo.logNotification(log);
      const logs = await repo.getLogs("1");
      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual(log);
    });
  });

  describe("Cleanup", () => {
    it("deletes older notifications", async () => {
      const oldDate = new Date("2023-01-01");
      const newDate = new Date("2023-02-01");
      const cutoff = new Date("2023-01-15");

      const n1 = { ...mockNotification, id: "1", createdAt: oldDate };
      const n2 = { ...mockNotification, id: "2", createdAt: newDate };

      await repo.createNotification(n1);
      await repo.createNotification(n2);

      const deleted = await repo.deleteOlderThan(cutoff);
      expect(deleted).toBe(1);

      const remaining = await repo.getUserNotifications("user-1");
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe("2");
    });
  });

  describe("Statistics", () => {
    it("calculates statistics", async () => {
      const now = new Date();
      const n1 = {
        ...mockNotification,
        id: "1",
        status: NotificationStatus.PENDING,
        createdAt: now,
      };
      const n2 = {
        ...mockNotification,
        id: "2",
        status: NotificationStatus.READ,
        createdAt: now,
      };

      await repo.createNotification(n1);
      await repo.createNotification(n2);

      const stats = await repo.getStatistics("user-1");
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.read).toBe(1);
    });
  });
});
