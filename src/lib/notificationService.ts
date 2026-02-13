/**
 * Core Notification Service Engine
 * Handles notification creation, routing, and delivery across channels
 * Refactored to use NotificationService with Repository Pattern
 */

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
} from "./notifications.types";
import { notificationService } from "./notifications";

/**
 * Generate unique notification ID
 */
export function generateNotificationId(): string {
  return notificationService.generateNotificationId();
}

/**
 * Create and store notification
 */
export async function createNotification(
  type: NotificationType,
  recipientId: string,
  payload: NotificationPayload,
  channels: NotificationChannel[],
  priority: NotificationPriority = NotificationPriority.MEDIUM,
): Promise<Notification> {
  return notificationService.createNotification(
    type,
    recipientId,
    payload,
    channels,
    priority,
  );
}

/**
 * Get notification by ID
 */
export async function getNotification(
  id: string,
): Promise<Notification | undefined> {
  return notificationService.getNotification(id);
}

/**
 * Get all notifications for user
 */
export async function getUserNotifications(
  userId: string,
  limit: number = 50,
): Promise<Notification[]> {
  return notificationService.getUserNotifications(userId, limit);
}

/**
 * Get unread notifications for user
 */
export async function getUnreadNotifications(
  userId: string,
): Promise<Notification[]> {
  return notificationService.getUnreadNotifications(userId);
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string,
): Promise<Notification | undefined> {
  return notificationService.markAsRead(notificationId);
}

/**
 * Mark notifications as delivered
 */
export async function markAsDelivered(
  notificationId: string,
  channel: NotificationChannel,
): Promise<Notification | undefined> {
  return notificationService.markAsDelivered(notificationId, channel);
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
  failureReason?: string,
): Promise<Notification | undefined> {
  return notificationService.updateNotificationStatus(
    notificationId,
    status,
    failureReason,
  );
}

/**
 * Save notification preference
 */
export async function savePreference(
  preference: NotificationPreference,
): Promise<NotificationPreference> {
  return notificationService.savePreference(preference);
}

/**
 * Get notification preferences for user
 */
export async function getPreferences(
  userId: string,
): Promise<NotificationPreference[]> {
  return notificationService.getPreferences(userId);
}

/**
 * Get specific preference
 */
export async function getPreference(
  userId: string,
  type: NotificationType,
): Promise<NotificationPreference | undefined> {
  return notificationService.getPreference(userId, type);
}

/**
 * Check if notification should be sent to user
 */
export async function shouldSendNotification(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<boolean> {
  return notificationService.shouldSendNotification(userId, type, channel);
}

/**
 * Create notification queue
 */
export function createQueue(channel: NotificationChannel): NotificationQueue {
  return notificationService.createQueue(channel);
}

/**
 * Add notification to queue
 */
export function addToQueue(
  queueId: string,
  notification: Notification,
): boolean {
  return notificationService.addToQueue(queueId, notification);
}

/**
 * Get queue
 */
export function getQueue(queueId: string): NotificationQueue | undefined {
  return notificationService.getQueue(queueId);
}

/**
 * Update queue status
 */
export function updateQueueStatus(
  queueId: string,
  status: "processing" | "idle" | "paused",
): NotificationQueue | undefined {
  return notificationService.updateQueueStatus(queueId, status);
}

/**
 * Log notification delivery
 */
export async function logNotification(
  notificationId: string,
  channel: NotificationChannel,
  status: NotificationStatus,
  message: string,
  errorCode?: string,
): Promise<void> {
  return notificationService.logNotification(
    notificationId,
    channel,
    status,
    message,
    errorCode,
  );
}

/**
 * Get notification logs
 */
export async function getLogs(
  notificationId?: string,
  limit: number = 100,
): Promise<NotificationLog[]> {
  return notificationService.getLogs(notificationId, limit);
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: string,
): Promise<boolean> {
  return notificationService.deleteNotification(notificationId);
}

/**
 * Clear old notifications (older than days)
 */
export async function clearOldNotifications(
  days: number = 30,
): Promise<number> {
  return notificationService.clearOldNotifications(days);
}

/**
 * Get notification statistics
 */
export async function getStatistics(
  userId?: string,
  days: number = 7,
): Promise<Record<string, number>> {
  return notificationService.getStatistics(userId, days);
}
