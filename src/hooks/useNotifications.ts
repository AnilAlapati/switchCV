/**
 * useNotifications Hook
 * State management for real-time notifications and preferences
 */

import { useState, useCallback } from "react";
import {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPreference,
  NotificationPayload,
  NotificationPriority,
} from "@/lib/notifications.types";
import {
  createNotification,
  getUserNotifications,
  getUnreadNotifications,
  markAsRead,
  getPreferences,
  savePreference,
  shouldSendNotification,
  getStatistics,
  deleteNotification as serviceDeleteNotification,
} from "@/lib/notificationService";
import {
  sendMultiChannel,
  getDeliveryStatus,
} from "@/lib/notificationDelivery";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  preferences: NotificationPreference[];
  statistics: Record<string, number>;
  sendNotification: (
    type: NotificationType,
    payload: NotificationPayload,
    channels: NotificationChannel[],
    priority?: NotificationPriority
  ) => Promise<Notification | null>;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  deleteNotification: (notificationId: string) => void;
  updatePreference: (preference: NotificationPreference) => void;
  refreshNotifications: () => void;
  getDeliveryStatus: (notificationId: string) => Record<string, boolean>;
}

export function useNotifications(userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Record<string, number>>({});

  const refreshNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const userNotifications = await getUserNotifications(userId);
      setNotifications(userNotifications);

      const userPreferences = await getPreferences(userId);
      setPreferences(userPreferences);

      const stats = await getStatistics(userId);
      setStatistics(stats);

      setError(null);
    } catch (err) {
      setError(`Failed to load notifications: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const sendNotification = useCallback(
    async (
      type: NotificationType,
      payload: NotificationPayload,
      channels: NotificationChannel[],
      priority: NotificationPriority = NotificationPriority.MEDIUM
    ): Promise<Notification | null> => {
      try {
        setLoading(true);

        // Filter channels based on preferences
        const allowedChannels = [];
        for (const channel of channels) {
          if (await shouldSendNotification(userId, type, channel)) {
            allowedChannels.push(channel);
          }
        }

        if (allowedChannels.length === 0) {
          setError("No enabled notification channels");
          return null;
        }

        const notification = await createNotification(
          type,
          userId,
          payload,
          allowedChannels,
          priority
        );

        // Send through all channels
        await sendMultiChannel(notification, {
          email: "user@example.com",
          phone: "+1234567890",
          pushToken: "sample_token",
        });

        await refreshNotifications();
        return notification;
      } catch (err) {
        const errorMsg = `Failed to send notification: ${err}`;
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [userId, refreshNotifications]
  );

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        await markAsRead(notificationId);
        await refreshNotifications();
      } catch (err) {
        setError(`Failed to mark as read: ${err}`);
      }
    },
    [refreshNotifications]
  );

  const markAllRead = useCallback(async () => {
    try {
      const unread = await getUnreadNotifications(userId);
      await Promise.all(unread.map((n) => markAsRead(n.id)));
      await refreshNotifications();
    } catch (err) {
      setError(`Failed to mark all as read: ${err}`);
    }
  }, [userId, refreshNotifications]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await serviceDeleteNotification(notificationId);
        await refreshNotifications();
      } catch (err) {
        setError(`Failed to delete notification: ${err}`);
      }
    },
    [refreshNotifications]
  );

  const updatePreference = useCallback(
    async (preference: NotificationPreference) => {
      try {
        const updated = {
          ...preference,
          userId,
          updatedAt: new Date(),
        };
        await savePreference(updated);
        setPreferences((prev) => {
          const index = prev.findIndex((p) => p.type === preference.type);
          if (index >= 0) {
            const newPrefs = [...prev];
            newPrefs[index] = updated;
            return newPrefs;
          }
          return [...prev, updated];
        });
        setError(null);
      } catch (err) {
        setError(`Failed to update preference: ${err}`);
      }
    },
    [userId]
  );

  const getDeliveryStatusWrapper = useCallback((notificationId: string) => {
    return getDeliveryStatus(notificationId);
  }, []);

  const unreadCount = notifications.filter(
    (n) => n.status !== NotificationStatus.READ
  ).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    statistics,
    sendNotification,
    markRead,
    markAllRead,
    deleteNotification,
    updatePreference,
    refreshNotifications,
    getDeliveryStatus: getDeliveryStatusWrapper,
  };
}
