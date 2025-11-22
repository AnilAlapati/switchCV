import {
  Notification,
  NotificationPreference,
  NotificationLog,
} from "../../notifications.types";
import { NotificationRepository } from "../repository";

export class MemoryNotificationRepository implements NotificationRepository {
  private notificationStore = new Map<string, Notification>();
  private preferenceStore = new Map<string, NotificationPreference[]>();
  private logStore: NotificationLog[] = [];

  async createNotification(notification: Notification): Promise<Notification> {
    this.notificationStore.set(notification.id, notification);
    return notification;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notificationStore.get(id);
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    return Array.from(this.notificationStore.values())
      .filter((n) => n.recipientId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async updateNotification(notification: Notification): Promise<Notification> {
    this.notificationStore.set(notification.id, notification);
    return notification;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notificationStore.delete(id);
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceStore.get(userId) || [];
  }

  async savePreference(
    preference: NotificationPreference
  ): Promise<NotificationPreference> {
    const preferences = this.preferenceStore.get(preference.userId) || [];
    const index = preferences.findIndex((p) => p.type === preference.type);

    if (index >= 0) {
      preferences[index] = preference;
    } else {
      preferences.push(preference);
    }

    this.preferenceStore.set(preference.userId, preferences);
    return preference;
  }

  async logNotification(log: NotificationLog): Promise<void> {
    this.logStore.push(log);
  }

  async getLogs(
    notificationId?: string,
    limit: number = 100
  ): Promise<NotificationLog[]> {
    let logs = this.logStore;
    if (notificationId) {
      logs = logs.filter((l) => l.notificationId === notificationId);
    }
    return logs.slice(-limit);
  }

  async deleteOlderThan(date: Date): Promise<number> {
    let deletedCount = 0;
    for (const [id, notification] of this.notificationStore.entries()) {
      if (notification.createdAt < date) {
        this.notificationStore.delete(id);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async getStatistics(
    userId?: string,
    days: number = 7
  ): Promise<Record<string, number>> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let notifications = Array.from(this.notificationStore.values()).filter(
      (n) => n.createdAt > cutoffDate
    );

    if (userId) {
      notifications = notifications.filter((n) => n.recipientId === userId);
    }

    return {
      total: notifications.length,
      pending: notifications.filter((n) => n.status === "pending").length,
      sent: notifications.filter((n) => n.status === "sent").length,
      delivered: notifications.filter((n) => n.status === "delivered").length,
      read: notifications.filter((n) => n.status === "read").length,
      failed: notifications.filter((n) => n.status === "failed").length,
    };
  }
}
