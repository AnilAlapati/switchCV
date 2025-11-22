/**
 * Notification Delivery Handlers
 * Multi-channel delivery: in-app, email, SMS, push notifications
 */

import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationTemplate,
} from "./notifications.types";
import {
  updateNotificationStatus,
  logNotification,
} from "./notificationService";

const templateStore = new Map<string, NotificationTemplate>();
const deliveryStore: Record<string, boolean> = {};

/**
 * Save notification template
 */
export function saveTemplate(
  template: NotificationTemplate
): NotificationTemplate {
  templateStore.set(template.id, template);
  return template;
}

/**
 * Get template
 */
export function getTemplate(id: string): NotificationTemplate | undefined {
  return templateStore.get(id);
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(`{{${key}}}`, value);
  }

  return rendered;
}

/**
 * Send in-app notification (immediate)
 */
export function sendInApp(notification: Notification): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const inAppKey = `in-app_${notification.id}`;
      deliveryStore[inAppKey] = true;

      updateNotificationStatus(notification.id, NotificationStatus.DELIVERED);
      logNotification(
        notification.id,
        NotificationChannel.IN_APP,
        NotificationStatus.DELIVERED,
        "In-app notification delivered"
      );

      resolve(true);
    } catch (error) {
      logNotification(
        notification.id,
        NotificationChannel.IN_APP,
        NotificationStatus.FAILED,
        `Failed to deliver in-app notification: ${error}`
      );
      resolve(false);
    }
  });
}

/**
 * Send email notification
 */
export async function sendEmail(
  notification: Notification,
  recipientEmail: string
): Promise<boolean> {
  try {
    // Simulate email sending
    const emailKey = `email_${notification.id}`;
    deliveryStore[emailKey] = true;

    logNotification(
      notification.id,
      NotificationChannel.EMAIL,
      NotificationStatus.SENT,
      `Email sent to ${recipientEmail}`
    );

    // Simulate delivery confirmation after delay
    setTimeout(() => {
      updateNotificationStatus(notification.id, NotificationStatus.DELIVERED);
      logNotification(
        notification.id,
        NotificationChannel.EMAIL,
        NotificationStatus.DELIVERED,
        "Email delivered"
      );
    }, 1000);

    return true;
  } catch (error) {
    logNotification(
      notification.id,
      NotificationChannel.EMAIL,
      NotificationStatus.FAILED,
      `Failed to send email: ${error}`
    );
    return false;
  }
}

/**
 * Send SMS notification
 */
export async function sendSMS(
  notification: Notification,
  recipientPhone: string
): Promise<boolean> {
  try {
    // Validate phone number format
    if (!recipientPhone || recipientPhone.length < 10) {
      throw new Error("Invalid phone number");
    }

    const smsKey = `sms_${notification.id}`;
    deliveryStore[smsKey] = true;

    logNotification(
      notification.id,
      NotificationChannel.SMS,
      NotificationStatus.SENT,
      `SMS sent to ${recipientPhone}`
    );

    // Simulate delivery
    setTimeout(() => {
      updateNotificationStatus(notification.id, NotificationStatus.DELIVERED);
    }, 1500);

    return true;
  } catch (error) {
    logNotification(
      notification.id,
      NotificationChannel.SMS,
      NotificationStatus.FAILED,
      `Failed to send SMS: ${error}`
    );
    return false;
  }
}

/**
 * Send push notification
 */
export async function sendPush(
  notification: Notification,
  pushToken: string
): Promise<boolean> {
  try {
    if (!pushToken) {
      throw new Error("Invalid push token");
    }

    const pushKey = `push_${notification.id}`;
    deliveryStore[pushKey] = true;

    logNotification(
      notification.id,
      NotificationChannel.PUSH,
      NotificationStatus.SENT,
      `Push sent to token: ${pushToken.substring(0, 10)}...`
    );

    // Simulate delivery
    setTimeout(() => {
      updateNotificationStatus(notification.id, NotificationStatus.DELIVERED);
    }, 800);

    return true;
  } catch (error) {
    logNotification(
      notification.id,
      NotificationChannel.PUSH,
      NotificationStatus.FAILED,
      `Failed to send push: ${error}`
    );
    return false;
  }
}

/**
 * Send webhook notification
 */
export async function sendWebhook(
  notification: Notification,
  webhookUrl: string
): Promise<boolean> {
  try {
    if (!webhookUrl) {
      throw new Error("Invalid webhook URL");
    }

    const webhookKey = `webhook_${notification.id}`;
    deliveryStore[webhookKey] = true;

    logNotification(
      notification.id,
      NotificationChannel.WEBHOOK,
      NotificationStatus.SENT,
      `Webhook sent to ${webhookUrl}`
    );

    // Simulate webhook delivery
    setTimeout(() => {
      updateNotificationStatus(notification.id, NotificationStatus.DELIVERED);
      logNotification(
        notification.id,
        NotificationChannel.WEBHOOK,
        NotificationStatus.DELIVERED,
        "Webhook acknowledged"
      );
    }, 1200);

    return true;
  } catch (error) {
    logNotification(
      notification.id,
      NotificationChannel.WEBHOOK,
      NotificationStatus.FAILED,
      `Failed to send webhook: ${error}`
    );
    return false;
  }
}

/**
 * Send notification to multiple channels
 */
export async function sendMultiChannel(
  notification: Notification,
  recipientData: {
    email?: string;
    phone?: string;
    pushToken?: string;
    webhookUrl?: string;
  }
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  const channelPromises = notification.channels.map(async (channel) => {
    switch (channel) {
      case "in-app":
        return ["in-app", await sendInApp(notification)];
      case "email":
        return [
          "email",
          recipientData.email
            ? await sendEmail(notification, recipientData.email)
            : false,
        ];
      case "sms":
        return [
          "sms",
          recipientData.phone
            ? await sendSMS(notification, recipientData.phone)
            : false,
        ];
      case "push":
        return [
          "push",
          recipientData.pushToken
            ? await sendPush(notification, recipientData.pushToken)
            : false,
        ];
      case "webhook":
        return [
          "webhook",
          recipientData.webhookUrl
            ? await sendWebhook(notification, recipientData.webhookUrl)
            : false,
        ];
      default:
        return [channel, false];
    }
  });

  const deliveryResults = await Promise.all(channelPromises);

  for (const [channel, success] of deliveryResults) {
    results[channel as string] = success as boolean;
  }

  return results;
}

/**
 * Get delivery status for notification
 */
export function getDeliveryStatus(
  notificationId: string
): Record<string, boolean> {
  const status: Record<string, boolean> = {};

  const channels = ["in-app", "email", "sms", "push", "webhook"];

  for (const channel of channels) {
    status[channel] = deliveryStore[`${channel}_${notificationId}`] || false;
  }

  return status;
}

/**
 * Clear delivery tracking
 */
export function clearDeliveryTracking(): void {
  for (const key in deliveryStore) {
    delete deliveryStore[key];
  }
}
