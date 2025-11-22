import { Notification, NotificationPreference, NotificationLog } from "../notifications.types";

export interface NotificationRepository {
  // Notification CRUD
  createNotification(notification: Notification): Promise<Notification>;
  getNotification(id: string): Promise<Notification | undefined>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  updateNotification(notification: Notification): Promise<Notification>;
  deleteNotification(id: string): Promise<boolean>;
  
  // Preferences
  getPreferences(userId: string): Promise<NotificationPreference[]>;
  savePreference(preference: NotificationPreference): Promise<NotificationPreference>;
  
  // Logs
  logNotification(log: NotificationLog): Promise<void>;
  getLogs(notificationId?: string, limit?: number): Promise<NotificationLog[]>;
  
  // Maintenance
  deleteOlderThan(date: Date): Promise<number>;
  getStatistics(userId?: string, days?: number): Promise<Record<string, number>>;
}
