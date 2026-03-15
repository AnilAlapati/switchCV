/**
 * POST /api/notifications
 * Notification management endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationPayload,
  NotificationPreference,
} from "@/lib/notifications.types";
import {
  createNotification,
  getUserNotifications,
  getUnreadNotifications,
  getNotification,
  markAsRead,
  getPreferences,
  savePreference,
  getStatistics,
  deleteNotification,
  generateNotificationId,
} from "@/lib/notificationService";
import {
  sendMultiChannel,
  getDeliveryStatus,
} from "@/lib/notificationDelivery";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { notificationRequestSchema } from "@/lib/validations/notification";

interface NotificationActionData {
  type: string;
  payload: NotificationPayload;
  channels: string[];
  priority?: NotificationPriority;
  email?: string;
  phone?: string;
  pushToken?: string;
  webhookUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !authUserId)
      return authError || handleApiError(null, "Unauthorized", 401);

    // Rate Limit
    const constants = await getConstants();
    const rateLimitResult = await checkDistributedRateLimit(authUserId!, {
      scope: "notifications",
      limit: constants.RATE_LIMITS.NOTIFICATIONS_PER_MINUTE,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      return handleApiError(null, "Too many requests", 429);
    }

    const body = await request.json();
    const validationResult = notificationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(null, "Invalid request parameters", 400);
    }
    const { action, userId, data } = validationResult.data;

    if (userId !== authUserId) {
      return handleApiError(null, "Forbidden", 403);
    }

    // Type-narrow optional data fields for each action
    const notificationId = (data?.notificationId ?? "") as string;
    const preference = (data?.preference ??
      {}) as Partial<NotificationPreference>;
    const actionData = (data ?? undefined) as
      | NotificationActionData
      | undefined;

    switch (action) {
      case "send":
        if (!actionData)
          return handleApiError(null, "Missing notification data", 400);
        return handleSend(userId, actionData);

      case "mark-read":
        return handleMarkRead(notificationId, authUserId);

      case "mark-all-read":
        return handleMarkAllRead(userId);

      case "delete":
        return handleDelete(notificationId, authUserId);

      case "get-preferences":
        return handleGetPreferences(userId);

      case "update-preference":
        if (!data?.preference)
          return handleApiError(null, "Missing required fields", 400);
        return handleUpdatePreference(userId, preference);

      case "get-delivery-status":
        return handleGetDeliveryStatus(notificationId, authUserId);

      default:
        return handleApiError(null, "Unknown action", 400);
    }
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !authUserId)
      return authError || handleApiError(null, "Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const notificationId = searchParams.get("notificationId");

    if (userId && userId !== authUserId) {
      return handleApiError(null, "Forbidden", 403);
    }

    switch (action) {
      case "get-notifications":
        return handleGetNotifications(userId);

      case "get-unread":
        return handleGetUnread(userId);

      case "get-statistics":
        return handleGetStatistics(userId || authUserId);

      case "get-delivery-status":
        return handleGetDeliveryStatus(notificationId, authUserId);

      default:
        return handleApiError(null, "Unknown action", 400);
    }
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}

async function handleSend(userId: string, data: NotificationActionData) {
  const {
    type,
    payload,
    channels,
    priority = NotificationPriority.MEDIUM,
  } = data;

  if (!userId || !type || !payload || !channels) {
    return handleApiError(null, "Missing required fields", 400);
  }

  const notification = await createNotification(
    type as NotificationType,
    userId,
    payload,
    channels as NotificationChannel[],
    priority as NotificationPriority,
  );

  // Send through all channels
  const results = await sendMultiChannel(notification, {
    email: data.email,
    phone: data.phone,
    pushToken: data.pushToken,
    webhookUrl: data.webhookUrl,
  });

  return NextResponse.json({
    success: true,
    notification,
    deliveryResults: results,
  });
}

async function handleMarkRead(notificationId: string, authUserId: string) {
  if (!notificationId) {
    return handleApiError(null, "Missing notificationId", 400);
  }

  // Ownership check
  const notification = await getNotification(notificationId);
  if (!notification || notification.recipientId !== authUserId) {
    return handleApiError(
      null,
      "Forbidden: You do not own this notification",
      403,
    );
  }

  await markAsRead(notificationId);

  return NextResponse.json({ success: true });
}

async function handleMarkAllRead(userId: string) {
  if (!userId) {
    return handleApiError(null, "Missing userId", 400);
  }

  const unread = await getUnreadNotifications(userId);
  await Promise.all(unread.map((n) => markAsRead(n.id)));

  return NextResponse.json({ success: true, markedCount: unread.length });
}

async function handleDelete(notificationId: string, authUserId: string) {
  if (!notificationId) {
    return handleApiError(null, "Missing notificationId", 400);
  }

  // Ownership check
  const notification = await getNotification(notificationId);
  if (!notification || notification.recipientId !== authUserId) {
    return handleApiError(
      null,
      "Forbidden: You do not own this notification",
      403,
    );
  }

  await deleteNotification(notificationId);

  return NextResponse.json({ success: true });
}

async function handleGetNotifications(userId: string | null) {
  if (!userId) {
    return handleApiError(null, "Missing userId", 400);
  }

  const notifications = await getUserNotifications(userId);

  return NextResponse.json({
    success: true,
    notifications,
    count: notifications.length,
  });
}

async function handleGetUnread(userId: string | null) {
  if (!userId) {
    return handleApiError(null, "Missing userId", 400);
  }

  const unread = await getUnreadNotifications(userId);

  return NextResponse.json({
    success: true,
    notifications: unread,
    count: unread.length,
  });
}

async function handleGetPreferences(userId: string) {
  if (!userId) {
    return handleApiError(null, "Missing userId", 400);
  }

  const preferences = await getPreferences(userId);

  return NextResponse.json({
    success: true,
    preferences,
  });
}

async function handleUpdatePreference(
  userId: string,
  preference: Partial<NotificationPreference>,
) {
  if (!userId || !preference) {
    return handleApiError(null, "Missing required fields", 400);
  }

  const updated: NotificationPreference = {
    ...preference,
    id: preference.id || `pref_${generateNotificationId()}`,
    userId,
    updatedAt: new Date(),
    type: preference.type || NotificationType.PROFILE_VIEW, // Default if not provided
    channels: preference.channels || [NotificationChannel.IN_APP],
    enabled: preference.enabled !== undefined ? preference.enabled : true,
    createdAt: preference.createdAt || new Date(),
  };

  await savePreference(updated);

  return NextResponse.json({
    success: true,
    preference: updated,
  });
}

async function handleGetStatistics(userId: string | null) {
  if (!userId) {
    return handleApiError(null, "Missing userId", 400);
  }

  const stats = await getStatistics(userId);

  return NextResponse.json({
    success: true,
    statistics: stats,
  });
}

async function handleGetDeliveryStatus(
  notificationId: string | null,
  authUserId: string,
) {
  if (!notificationId) {
    return handleApiError(null, "Missing notificationId", 400);
  }

  // Ownership check: verify notification belongs to this user
  const notification = await getNotification(notificationId);
  if (!notification || notification.recipientId !== authUserId) {
    return handleApiError(
      null,
      "Forbidden: You do not own this notification",
      403,
    );
  }

  const status = getDeliveryStatus(notificationId);

  return NextResponse.json({
    success: true,
    status,
  });
}
