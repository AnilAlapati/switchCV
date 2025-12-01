/**
 * POST /api/notifications
 * Notification management endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "@/lib/notifications.types";
import {
  createNotification,
  getUserNotifications,
  getUnreadNotifications,
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
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { notificationRequestSchema } from "@/lib/validations/notification";

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !authUserId)
      return authError || handleApiError(null, "Unauthorized", 401);

    // Rate Limit
    const constants = await getConstants();
    const rateLimitResult = await checkRateLimit(
      `${authUserId}:notifications`,
      {
        limit: constants.RATE_LIMITS.NOTIFICATIONS_PER_MINUTE,
        windowMs: 60 * 1000, // 1 minute
      }
    );

    if (!rateLimitResult.allowed) {
      return handleApiError(null, "Too many requests", 429);
    }

    const body = await request.json();
    const validationResult = notificationRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage =
        validationResult.error?.issues?.map((e) => e.message).join(", ") ||
        "Validation failed";
      return handleApiError(null, "Invalid request: " + errorMessage, 400);
    }
    const { action, userId, data } = validationResult.data;

    if (userId !== authUserId) {
      return handleApiError(null, "Forbidden", 403);
    }

    switch (action) {
      case "send":
        return handleSend(userId, data);

      case "mark-read":
        return handleMarkRead(data?.notificationId);

      case "mark-all-read":
        return handleMarkAllRead(userId);

      case "delete":
        return handleDelete(data?.notificationId);

      case "get-preferences":
        return handleGetPreferences(userId);

      case "update-preference":
        return handleUpdatePreference(userId, data?.preference);

      case "get-delivery-status":
        return handleGetDeliveryStatus(data?.notificationId);

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
        return handleGetStatistics(userId);

      case "get-delivery-status":
        return handleGetDeliveryStatus(notificationId);

      default:
        return handleApiError(null, "Unknown action", 400);
    }
  } catch (error) {
    return handleApiError(error, "Failed to process request");
  }
}

async function handleSend(userId: string, data: any) {
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
    priority as NotificationPriority
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

async function handleMarkRead(notificationId: string) {
  if (!notificationId) {
    return handleApiError(null, "Missing notificationId", 400);
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

async function handleDelete(notificationId: string) {
  if (!notificationId) {
    return handleApiError(null, "Missing notificationId", 400);
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

async function handleUpdatePreference(userId: string, preference: any) {
  if (!userId || !preference) {
    return handleApiError(null, "Missing required fields", 400);
  }

  const updated = {
    ...preference,
    id: preference.id || `pref_${generateNotificationId()}`,
    userId,
    updatedAt: new Date(),
  };

  await savePreference(updated);

  return NextResponse.json({
    success: true,
    preference: updated,
  });
}

async function handleGetStatistics(userId: string | null) {
  const stats = await getStatistics(userId || undefined);

  return NextResponse.json({
    success: true,
    statistics: stats,
  });
}

async function handleGetDeliveryStatus(notificationId: string | null) {
  if (!notificationId) {
    return handleApiError(null, "Missing notificationId", 400);
  }

  const status = getDeliveryStatus(notificationId);

  return NextResponse.json({
    success: true,
    status,
  });
}
