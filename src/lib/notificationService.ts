/**
 * Core Notification Service Engine
 * Handles notification creation, routing, and delivery across channels
 */

import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  NotificationPayload,
  NotificationQueue,
  NotificationLog,
  NotificationPreference,
} from "./notifications.types";

const notificationStore = new Map<string, Notification>();
const preferenceStore = new Map<string, NotificationPreference[]>();
const queueStore = new Map<string, NotificationQueue>();
const logStore: NotificationLog[] = [];

/**
 * Generate unique notification ID
 */
export function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create and store notification
 */
export function createNotification(
  type: NotificationType,
  recipientId: string,
  payload: NotificationPayload,
  channels: NotificationChannel[],
  priority: NotificationPriority = NotificationPriority.MEDIUM
): Notification {
  const notification: Notification = {
    id: generateNotificationId(),
    type,
    status: NotificationStatus.PENDING,
    priority,
    recipientId,
    channels,
    payload,
    createdAt: new Date(),
    retryCount: 0,
  };

  notificationStore.set(notification.id, notification);
  return notification;
}

/**
 * Get notification by ID
 */
export function getNotification(id: string): Notification | undefined {
  return notificationStore.get(id);
}

/**
 * Get all notifications for user
 */
export function getUserNotifications(
  userId: string,
  limit: number = 50
): Notification[] {
  const notifications = Array.from(notificationStore.values())
    .filter((n) => n.recipientId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);

  return notifications;
}

/**
 * Get unread notifications for user
 */
export function getUnreadNotifications(userId: string): Notification[] {
  return getUserNotifications(userId).filter(
    (n) => n.status !== NotificationStatus.READ
  );
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: string): Notification | undefined {
  const notification = notificationStore.get(notificationId);
  if (notification) {
    const updated = {
      ...notification,
      status: NotificationStatus.READ,
      readAt: new Date(),
    };
    notificationStore.set(notificationId, updated);
    return updated;
  }
  return undefined;
}

/**
 * Mark notifications as delivered
 */
export function markAsDelivered(
  notificationId: string,
  channel: NotificationChannel
): Notification | undefined {
  const notification = notificationStore.get(notificationId);
  if (notification) {
    const updated = {
      ...notification,
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
    };
    notificationStore.set(notificationId, updated);
    logNotification(
      notificationId,
      channel,
      NotificationStatus.DELIVERED,
      "Delivered"
    );
    return updated;
  }
  return undefined;
}

/**
 * Update notification status
 */
export function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
  failureReason?: string
): Notification | undefined {
  const notification = notificationStore.get(notificationId);
  if (notification) {
    const updated = {
      ...notification,
      status,
      failureReason,
      ...(status === NotificationStatus.SENT && { sentAt: new Date() }),
      ...(status === NotificationStatus.READ && { readAt: new Date() }),
    };
    notificationStore.set(notificationId, updated);
    return updated;
  }
  return undefined;
}

/**
 * Save notification preference
 */
export function savePreference(
  preference: NotificationPreference
): NotificationPreference {
  const preferences = preferenceStore.get(preference.userId) || [];
  const index = preferences.findIndex((p) => p.type === preference.type);

  if (index >= 0) {
    preferences[index] = preference;
  } else {
    preferences.push(preference);
  }

  preferenceStore.set(preference.userId, preferences);
  return preference;
}

/**
 * Get notification preferences for user
 */
export function getPreferences(userId: string): NotificationPreference[] {
  return preferenceStore.get(userId) || [];
}

/**
 * Get specific preference
 */
export function getPreference(
  userId: string,
  type: NotificationType
): NotificationPreference | undefined {
  const preferences = preferenceStore.get(userId) || [];
  return preferences.find((p) => p.type === type);
}

/**
 * Check if notification should be sent to user
 */
export function shouldSendNotification(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel
): boolean {
  const preference = getPreference(userId, type);

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

/**
 * Create notification queue
 */
export function createQueue(channel: NotificationChannel): NotificationQueue {
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

  queueStore.set(queue.id, queue);
  return queue;
}

/**
 * Add notification to queue
 */
export function addToQueue(
  queueId: string,
  notification: Notification
): boolean {
  const queue = queueStore.get(queueId);
  if (!queue) return false;

  queue.notifications.push(notification);
  queue.updatedAt = new Date();
  return true;
}

/**
 * Get queue
 */
export function getQueue(queueId: string): NotificationQueue | undefined {
  return queueStore.get(queueId);
}

/**
 * Update queue status
 */
export function updateQueueStatus(
  queueId: string,
  status: "processing" | "idle" | "paused"
): NotificationQueue | undefined {
  const queue = queueStore.get(queueId);
  if (queue) {
    queue.status = status;
    queue.updatedAt = new Date();
    return queue;
  }
  return undefined;
}

/**
 * Log notification delivery
 */
export function logNotification(
  notificationId: string,
  channel: NotificationChannel,
  status: NotificationStatus,
  message: string,
  errorCode?: string
): void {
  const log = {
    id: `log_${Date.now()}`,
    notificationId,
    channel,
    status,
    message,
    errorCode,
    timestamp: new Date(),
  };

  logStore.push(log);
}

/**
 * Get notification logs
 */
export function getLogs(notificationId?: string, limit: number = 100): any[] {
  let logs = logStore;

  if (notificationId) {
    logs = logs.filter((l) => l.notificationId === notificationId);
  }

  return logs.slice(-limit);
}

/**
 * Delete notification
 */
export function deleteNotification(notificationId: string): boolean {
  return notificationStore.delete(notificationId);
}

/**
 * Clear old notifications (older than days)
 */
export function clearOldNotifications(days: number = 30): number {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let deletedCount = 0;

  for (const [id, notification] of notificationStore.entries()) {
    if (notification.createdAt < cutoffDate) {
      notificationStore.delete(id);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Get notification statistics
 */
export function getStatistics(
  userId?: string,
  days: number = 7
): Record<string, number> {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let notifications = Array.from(notificationStore.values()).filter(
    (n) => n.createdAt > cutoffDate
  );

  if (userId) {
    notifications = notifications.filter((n) => n.recipientId === userId);
  }

  return {
    total: notifications.length,
    pending: notifications.filter(
      (n) => n.status === NotificationStatus.PENDING
    ).length,
    sent: notifications.filter((n) => n.status === NotificationStatus.SENT)
      .length,
    delivered: notifications.filter(
      (n) => n.status === NotificationStatus.DELIVERED
    ).length,
    read: notifications.filter((n) => n.status === NotificationStatus.READ)
      .length,
    failed: notifications.filter((n) => n.status === NotificationStatus.FAILED)
      .length,
  };
}
