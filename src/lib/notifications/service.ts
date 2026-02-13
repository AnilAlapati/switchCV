import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationPayload,
  NotificationQueue,
  NotificationPreference,
  NotificationLog,
} from "../notifications.types";
import { NotificationRepository } from "./repository";

export class NotificationService {
  private repository: NotificationRepository;
  private queueStore = new Map<string, NotificationQueue>();

  constructor(repository: NotificationRepository) {
    this.repository = repository;
  }

  generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createNotification(
    type: NotificationType,
    recipientId: string,
    payload: NotificationPayload,
    channels: NotificationChannel[],
    priority: NotificationPriority = NotificationPriority.MEDIUM,
  ): Promise<Notification> {
    const notification: Notification = {
      id: this.generateNotificationId(),
      type,
      status: NotificationStatus.PENDING,
      priority,
      recipientId,
      channels,
      payload,
      createdAt: new Date(),
      retryCount: 0,
    };

    return this.repository.createNotification(notification);
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.repository.getNotification(id);
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    return this.repository.getUserNotifications(userId, limit);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const notifications = await this.getUserNotifications(userId);
    return notifications.filter((n) => n.status !== NotificationStatus.READ);
  }

  async markAsRead(notificationId: string): Promise<Notification | undefined> {
    const notification = await this.repository.getNotification(notificationId);
    if (notification) {
      const updated = {
        ...notification,
        status: NotificationStatus.READ,
        readAt: new Date(),
      };
      return this.repository.updateNotification(updated);
    }
    return undefined;
  }

  async markAsDelivered(
    notificationId: string,
    channel: NotificationChannel,
  ): Promise<Notification | undefined> {
    const notification = await this.repository.getNotification(notificationId);
    if (notification) {
      const updated = {
        ...notification,
        status: NotificationStatus.DELIVERED,
        deliveredAt: new Date(),
      };
      await this.repository.updateNotification(updated);
      await this.logNotification(
        notificationId,
        channel,
        NotificationStatus.DELIVERED,
        "Delivered",
      );
      return updated;
    }
    return undefined;
  }

  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    failureReason?: string,
  ): Promise<Notification | undefined> {
    const notification = await this.repository.getNotification(notificationId);
    if (notification) {
      const updated = {
        ...notification,
        status,
        failureReason,
        ...(status === NotificationStatus.SENT && { sentAt: new Date() }),
        ...(status === NotificationStatus.READ && { readAt: new Date() }),
      };
      return this.repository.updateNotification(updated);
    }
    return undefined;
  }

  async savePreference(
    preference: NotificationPreference,
  ): Promise<NotificationPreference> {
    return this.repository.savePreference(preference);
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.repository.getPreferences(userId);
  }

  async getPreference(
    userId: string,
    type: NotificationType,
  ): Promise<NotificationPreference | undefined> {
    const preferences = await this.repository.getPreferences(userId);
    return preferences.find((p) => p.type === type);
  }

  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const preference = await this.getPreference(userId, type);

    if (!preference || !preference.enabled) {
      return false;
    }

    if (!preference.channels.includes(channel)) {
      return false;
    }

    if (preference.quietHours?.enabled) {
      const now = new Date();
      const timeStr = now.toTimeString().substr(0, 5);
      const { startTime, endTime } = preference.quietHours;

      if (timeStr >= startTime && timeStr <= endTime) {
        return false;
      }
    }

    return true;
  }

  // Queue Management (In-Memory for now, could be moved to Repo)
  createQueue(channel: NotificationChannel): NotificationQueue {
    const queue: NotificationQueue = {
      id: `queue_${Date.now()}`,
      notifications: [],
      channel,
      status: "idle",
      processedCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.queueStore.set(queue.id, queue);
    return queue;
  }

  addToQueue(queueId: string, notification: Notification): boolean {
    const queue = this.queueStore.get(queueId);
    if (!queue) return false;

    queue.notifications.push(notification);
    queue.updatedAt = new Date();
    return true;
  }

  getQueue(queueId: string): NotificationQueue | undefined {
    return this.queueStore.get(queueId);
  }

  updateQueueStatus(
    queueId: string,
    status: "processing" | "idle" | "paused",
  ): NotificationQueue | undefined {
    const queue = this.queueStore.get(queueId);
    if (queue) {
      queue.status = status;
      queue.updatedAt = new Date();
      return queue;
    }
    return undefined;
  }

  async logNotification(
    notificationId: string,
    channel: NotificationChannel,
    status: NotificationStatus,
    message: string,
    errorCode?: string,
  ): Promise<void> {
    const log = {
      id: `log_${Date.now()}`,
      notificationId,
      channel,
      status,
      message,
      errorCode,
      timestamp: new Date(),
    };

    await this.repository.logNotification(log);
  }

  async getLogs(
    notificationId?: string,
    limit: number = 100,
  ): Promise<NotificationLog[]> {
    return this.repository.getLogs(notificationId, limit);
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    return this.repository.deleteNotification(notificationId);
  }

  async clearOldNotifications(days: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.repository.deleteOlderThan(cutoffDate);
  }

  async getStatistics(
    userId?: string,
    days: number = 7,
  ): Promise<Record<string, number>> {
    return this.repository.getStatistics(userId, days);
  }
}
