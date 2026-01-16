import { POST, GET } from "@/app/api/notifications/route";
import { NextRequest } from "next/server";
import * as notificationService from "@/lib/notificationService";
import * as notificationDelivery from "@/lib/notificationDelivery";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers";

jest.mock("@/lib/notificationService");
jest.mock("@/lib/notificationDelivery");
jest.mock("@/lib/utils/rateLimit");
jest.mock("@/lib/getSystemConfig");
jest.mock("@/lib/utils/api-helpers", () => ({
  getAuthenticatedUserId: jest.fn(),
  handleApiError: jest.fn((err, msg, status) => ({
    status: status || 500,
    json: async () => ({ error: msg }),
  })),
}));

describe("Notifications API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getConstants as jest.Mock).mockResolvedValue({
      RATE_LIMITS: { NOTIFICATIONS_PER_MINUTE: 10 },
    });
    (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
    (notificationService.getNotification as jest.Mock).mockResolvedValue({
      id: "notif-1",
      recipientId: "user-123",
      userId: "user-123",
    });
    (notificationService.getUnreadNotifications as jest.Mock).mockResolvedValue([]);
    (notificationService.getPreferences as jest.Mock).mockResolvedValue({ email: true });
  });

  describe("POST", () => {
    it("should return 401 if not authenticated", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: null,
        error: { status: 401, json: async () => ({ error: "Unauthorized" }) },
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("should return 429 if rate limited", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });
      (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: false });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(429);
    });

    it("should return 400 if validation fails", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({ action: "send" }), // Missing userId and data
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("should return 403 if userId mismatch", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "send",
            userId: "other-user",
            data: {},
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(403);
    });

    it("should send notification successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const mockNotification = { id: "notif-1" };
      (notificationService.createNotification as jest.Mock).mockResolvedValue(
        mockNotification
      );
      (notificationDelivery.sendMultiChannel as jest.Mock).mockResolvedValue({
        email: "sent",
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "send",
            userId: "user-123",
            data: { type: "test", payload: {}, channels: ["email"] },
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notification).toEqual(mockNotification);
    });

    it("should mark as read successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "mark-read",
            userId: "user-123",
            data: { notificationId: "notif-1" },
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(notificationService.markAsRead).toHaveBeenCalledWith("notif-1");
    });

    it("should mark all as read successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (
        notificationService.getUnreadNotifications as jest.Mock
      ).mockResolvedValue([{ id: "n1" }, { id: "n2" }]);

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "mark-all-read",
            userId: "user-123",
            data: {},
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.markedCount).toBe(2);
    });

    it("should delete notification successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "delete",
            userId: "user-123",
            data: { notificationId: "notif-1" },
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(notificationService.deleteNotification).toHaveBeenCalledWith(
        "notif-1"
      );
    });

    it("should get preferences successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (notificationService.getPreferences as jest.Mock).mockResolvedValue({
        email: true,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "get-preferences",
            userId: "user-123",
            data: {},
          }),
        }
      );

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toEqual({ email: true });
    });

    it("should update preference successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "update-preference",
            userId: "user-123",
            data: { preference: { email: false } },
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(200);
      expect(notificationService.savePreference).toHaveBeenCalled();
    });

    it("should return 400 for unknown action", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      const req = new NextRequest(
        new URL("http://localhost:3000/api/notifications"),
        {
          method: "POST",
          body: JSON.stringify({
            action: "unknown",
            userId: "user-123",
            data: {},
          }),
        }
      );

      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe("GET", () => {
    it("should get notifications successfully", async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue({
        userId: "user-123",
        error: null,
      });

      (notificationService.getUserNotifications as jest.Mock).mockResolvedValue(
        [{ id: "n1" }]
      );

      const req = new NextRequest(
        new URL(
          "http://localhost:3000/api/notifications?action=get-notifications&userId=user-123"
        ),
        {
          method: "GET",
        }
      );

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.notifications).toHaveLength(1);
    });
  });
});
