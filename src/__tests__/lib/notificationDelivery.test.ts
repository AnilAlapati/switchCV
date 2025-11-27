import {
  saveTemplate,
  getTemplate,
  renderTemplate,
  sendInApp,
  sendEmail,
  sendSMS,
  sendPush,
  sendWebhook,
  sendMultiChannel,
  getDeliveryStatus,
  clearDeliveryTracking,
} from "@/lib/notificationDelivery";
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationTemplate,
  NotificationType,
  NotificationPriority,
} from "@/lib/notifications.types";
import {
  updateNotificationStatus,
  logNotification,
} from "@/lib/notificationService";

// Mock dependencies
jest.mock("@/lib/notificationService", () => ({
  updateNotificationStatus: jest.fn(),
  logNotification: jest.fn(),
}));

describe("Notification Delivery", () => {
  const mockNotification: Notification = {
    id: "notif-123",
    recipientId: "user-123",
    type: NotificationType.APPLICATION_UPDATE,
    priority: NotificationPriority.HIGH,
    channels: [NotificationChannel.IN_APP],
    status: NotificationStatus.PENDING,
    createdAt: new Date(),
    retryCount: 0,
    payload: {
      title: "Test Notification",
      body: "This is a test",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearDeliveryTracking();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Template Management", () => {
    it("should save and retrieve templates", () => {
      const template: NotificationTemplate = {
        id: "temp-1",
        type: NotificationType.APPLICATION_UPDATE,
        channel: NotificationChannel.EMAIL,
        subject: "Hello {{name}}",
        template: "Welcome to {{app}}",
        variables: ["name", "app"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      saveTemplate(template);
      const retrieved = getTemplate("temp-1");
      expect(retrieved).toEqual(template);
    });

    it("should return undefined for non-existent template", () => {
      expect(getTemplate("non-existent")).toBeUndefined();
    });

    it("should render template with variables", () => {
      const template = "Hello {{name}}, welcome to {{app}}";
      const variables = { name: "John", app: "Switch" };
      const rendered = renderTemplate(template, variables);
      expect(rendered).toBe("Hello John, welcome to Switch");
    });
  });

  describe("Channel Delivery", () => {
    describe("In-App", () => {
      it("should deliver in-app notification successfully", async () => {
        const result = await sendInApp(mockNotification);
        expect(result).toBe(true);
        expect(updateNotificationStatus).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationStatus.DELIVERED
        );
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.IN_APP,
          NotificationStatus.DELIVERED,
          expect.any(String)
        );
      });

      it("should handle errors during in-app delivery", async () => {
        (updateNotificationStatus as jest.Mock).mockImplementationOnce(() => {
          throw new Error("Update failed");
        });

        const result = await sendInApp(mockNotification);
        expect(result).toBe(false);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.IN_APP,
          NotificationStatus.FAILED,
          expect.stringContaining("Failed to deliver in-app notification")
        );
      });
    });

    describe("Email", () => {
      it("should send email successfully", async () => {
        const result = await sendEmail(mockNotification, "test@example.com");
        expect(result).toBe(true);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.EMAIL,
          NotificationStatus.SENT,
          expect.stringContaining("Email sent to")
        );

        // Fast-forward time to trigger delivery confirmation
        jest.runAllTimers();

        expect(updateNotificationStatus).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationStatus.DELIVERED
        );
      });

      it("should handle email sending errors", async () => {
        (logNotification as jest.Mock).mockImplementationOnce(() => {
          throw new Error("Log failed");
        });

        const result = await sendEmail(mockNotification, "test@example.com");
        expect(result).toBe(false);
      });
    });

    describe("SMS", () => {
      it("should send SMS successfully", async () => {
        const result = await sendSMS(mockNotification, "1234567890");
        expect(result).toBe(true);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.SMS,
          NotificationStatus.SENT,
          expect.stringContaining("SMS sent to")
        );

        jest.runAllTimers();
        expect(updateNotificationStatus).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationStatus.DELIVERED
        );
      });

      it("should fail for invalid phone number", async () => {
        const result = await sendSMS(mockNotification, "123");
        expect(result).toBe(false);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.SMS,
          NotificationStatus.FAILED,
          expect.stringContaining("Invalid phone number")
        );
      });
    });

    describe("Push", () => {
      it("should send push notification successfully", async () => {
        const result = await sendPush(mockNotification, "push-token-123");
        expect(result).toBe(true);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.PUSH,
          NotificationStatus.SENT,
          expect.stringContaining("Push sent to token")
        );

        jest.runAllTimers();
        expect(updateNotificationStatus).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationStatus.DELIVERED
        );
      });

      it("should fail for missing push token", async () => {
        const result = await sendPush(mockNotification, "");
        expect(result).toBe(false);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.PUSH,
          NotificationStatus.FAILED,
          expect.stringContaining("Invalid push token")
        );
      });
    });

    describe("Webhook", () => {
      it("should send webhook successfully", async () => {
        const result = await sendWebhook(
          mockNotification,
          "https://example.com/webhook"
        );
        expect(result).toBe(true);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.WEBHOOK,
          NotificationStatus.SENT,
          expect.stringContaining("Webhook sent to")
        );

        jest.runAllTimers();
        expect(updateNotificationStatus).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationStatus.DELIVERED
        );
      });

      it("should fail for missing webhook URL", async () => {
        const result = await sendWebhook(mockNotification, "");
        expect(result).toBe(false);
        expect(logNotification).toHaveBeenCalledWith(
          mockNotification.id,
          NotificationChannel.WEBHOOK,
          NotificationStatus.FAILED,
          expect.stringContaining("Invalid webhook URL")
        );
      });
    });
  });

  describe("Multi-Channel Delivery", () => {
    it("should send to multiple channels", async () => {
      const multiChannelNotification = {
        ...mockNotification,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      };

      const recipientData = {
        email: "test@example.com",
      };

      const results = await sendMultiChannel(
        multiChannelNotification,
        recipientData
      );

      expect(results["in-app"]).toBe(true);
      expect(results["email"]).toBe(true);
    });

    it("should handle missing recipient data for channels", async () => {
      const multiChannelNotification = {
        ...mockNotification,
        channels: [NotificationChannel.EMAIL],
      };

      const results = await sendMultiChannel(multiChannelNotification, {});

      expect(results["email"]).toBe(false);
    });
  });

  describe("Delivery Status Tracking", () => {
    it("should track delivery status", async () => {
      await sendInApp(mockNotification);
      const status = getDeliveryStatus(mockNotification.id);
      expect(status["in-app"]).toBe(true);
      expect(status["email"]).toBe(false);
    });
  });
});
