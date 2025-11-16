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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, data } = body;

    switch (action) {
      case "send":
        return handleSend(userId, data);

      case "mark-read":
        return handleMarkRead(data.notificationId);

      case "mark-all-read":
        return handleMarkAllRead(userId);

      case "delete":
        return handleDelete(data.notificationId);

      case "get-preferences":
        return handleGetPreferences(userId);

      case "update-preference":
        return handleUpdatePreference(userId, data.preference);

      case "get-delivery-status":
        return handleGetDeliveryStatus(data.notificationId);

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process request: ${error}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const notificationId = searchParams.get("notificationId");

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
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process request: ${error}` },
      { status: 500 }
    );
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
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const notification = createNotification(
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
    return NextResponse.json(
      { error: "Missing notificationId" },
      { status: 400 }
    );
  }

  markAsRead(notificationId);

  return NextResponse.json({ success: true });
}

async function handleMarkAllRead(userId: string) {
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const unread = getUnreadNotifications(userId);
  unread.forEach((n) => markAsRead(n.id));

  return NextResponse.json({ success: true, markedCount: unread.length });
}

async function handleDelete(notificationId: string) {
  if (!notificationId) {
    return NextResponse.json(
      { error: "Missing notificationId" },
      { status: 400 }
    );
  }

  deleteNotification(notificationId);

  return NextResponse.json({ success: true });
}

async function handleGetNotifications(userId: string | null) {
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const notifications = getUserNotifications(userId);

  return NextResponse.json({
    success: true,
    notifications,
    count: notifications.length,
  });
}

async function handleGetUnread(userId: string | null) {
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const unread = getUnreadNotifications(userId);

  return NextResponse.json({
    success: true,
    notifications: unread,
    count: unread.length,
  });
}

async function handleGetPreferences(userId: string) {
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const preferences = getPreferences(userId);

  return NextResponse.json({
    success: true,
    preferences,
  });
}

async function handleUpdatePreference(userId: string, preference: any) {
  if (!userId || !preference) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const updated = {
    ...preference,
    id: preference.id || `pref_${generateNotificationId()}`,
    userId,
    updatedAt: new Date(),
  };

  savePreference(updated);

  return NextResponse.json({
    success: true,
    preference: updated,
  });
}

async function handleGetStatistics(userId: string | null) {
  const stats = getStatistics(userId || undefined);

  return NextResponse.json({
    success: true,
    statistics: stats,
  });
}

async function handleGetDeliveryStatus(notificationId: string | null) {
  if (!notificationId) {
    return NextResponse.json(
      { error: "Missing notificationId" },
      { status: 400 }
    );
  }

  const status = getDeliveryStatus(notificationId);

  return NextResponse.json({
    success: true,
    status,
  });
}
