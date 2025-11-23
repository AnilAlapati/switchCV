import { FirestoreNotificationRepository } from "@/lib/notifications/repositories/firestoreRepository";
import { adminDb } from "@/lib/firebase-admin";

// Mock firebase-admin
jest.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

// Mock Timestamp
jest.mock("firebase-admin/firestore", () => {
  class MockTimestamp {
    date: Date;
    constructor(date: Date) {
      this.date = date;
    }
    toDate() {
      return this.date;
    }
    toMillis() {
      return this.date.getTime();
    }
    static fromDate(date: Date) {
      return new MockTimestamp(date);
    }
  }
  return {
    Timestamp: MockTimestamp,
  };
});

describe("FirestoreNotificationRepository", () => {
  let repository: FirestoreNotificationRepository;
  let mockCollection: any;
  let mockDoc: any;
  let mockBatch: any;

  beforeEach(() => {
    repository = new FirestoreNotificationRepository();
    jest.clearAllMocks();

    mockDoc = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      ref: "mock-ref",
    };

    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    mockBatch = {
      delete: jest.fn(),
      commit: jest.fn(),
    };

    (adminDb.collection as jest.Mock).mockReturnValue(mockCollection);
    (adminDb.batch as jest.Mock).mockReturnValue(mockBatch);
  });

  describe("createNotification", () => {
    it("should create a notification", async () => {
      const notification: any = {
        id: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await repository.createNotification(notification);

      expect(adminDb.collection).toHaveBeenCalledWith("notifications");
      expect(mockCollection.doc).toHaveBeenCalledWith("1");
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe("getNotification", () => {
    it("should return notification if exists", async () => {
      mockDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({
          id: "1",
          createdAt: { toDate: () => new Date() },
        }),
      });

      const result = await repository.getNotification("1");
      expect(result).toBeDefined();
      expect(result?.id).toBe("1");
    });

    it("should return undefined if not exists", async () => {
      mockDoc.get.mockResolvedValue({ exists: false });
      const result = await repository.getNotification("1");
      expect(result).toBeUndefined();
    });
  });

  describe("getUserNotifications", () => {
    it("should return user notifications", async () => {
      mockCollection.get.mockResolvedValue({
        docs: [
          {
            data: () => ({
              id: "1",
              createdAt: { toDate: () => new Date() },
            }),
          },
        ],
      });

      const result = await repository.getUserNotifications("user1");
      expect(result).toHaveLength(1);
      expect(mockCollection.where).toHaveBeenCalledWith(
        "recipientId",
        "==",
        "user1"
      );
    });
  });

  describe("updateNotification", () => {
    it("should update notification", async () => {
      const notification: any = { id: "1", status: "read" };
      await repository.updateNotification(notification);
      expect(mockDoc.set).toHaveBeenCalledWith(expect.anything(), {
        merge: true,
      });
    });
  });

  describe("deleteNotification", () => {
    it("should delete notification", async () => {
      await repository.deleteNotification("1");
      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe("getPreferences", () => {
    it("should return preferences", async () => {
      mockCollection.get.mockResolvedValue({
        docs: [{ data: () => ({ userId: "user1", type: "email" }) }],
      });

      const result = await repository.getPreferences("user1");
      expect(result).toHaveLength(1);
      expect(adminDb.collection).toHaveBeenCalledWith(
        "notification_preferences"
      );
    });
  });

  describe("savePreference", () => {
    it("should save preference", async () => {
      const pref: any = { userId: "user1", type: "email" };
      await repository.savePreference(pref);
      expect(mockCollection.doc).toHaveBeenCalledWith("user1_email");
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe("logNotification", () => {
    it("should log notification", async () => {
      const log: any = { id: "log1", notificationId: "1" };
      await repository.logNotification(log);
      expect(adminDb.collection).toHaveBeenCalledWith("notification_logs");
      expect(mockDoc.set).toHaveBeenCalled();
    });
  });

  describe("getLogs", () => {
    it("should get logs", async () => {
      mockCollection.get.mockResolvedValue({
        docs: [{ data: () => ({ id: "log1" }) }],
      });

      const result = await repository.getLogs("notif1");
      expect(result).toHaveLength(1);
      expect(mockCollection.where).toHaveBeenCalledWith(
        "notificationId",
        "==",
        "notif1"
      );
    });

    it("should get all logs if no notificationId", async () => {
      mockCollection.get.mockResolvedValue({
        docs: [{ data: () => ({ id: "log1" }) }],
      });

      await repository.getLogs();
      expect(mockCollection.where).not.toHaveBeenCalled();
    });
  });

  describe("deleteOlderThan", () => {
    it("should delete old notifications", async () => {
      mockCollection.get.mockResolvedValue({
        size: 2,
        docs: [{ ref: "ref1" }, { ref: "ref2" }],
      });

      const count = await repository.deleteOlderThan(new Date());
      expect(count).toBe(2);
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe("getStatistics", () => {
    it("should return statistics", async () => {
      mockCollection.get.mockResolvedValue({
        docs: [
          { data: () => ({ status: "sent" }) },
          { data: () => ({ status: "read" }) },
          { data: () => ({ status: "failed" }) },
        ],
      });

      const stats = await repository.getStatistics("user1");
      expect(stats.total).toBe(3);
      expect(stats.sent).toBe(1);
      expect(stats.read).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });
});
