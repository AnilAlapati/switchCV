import {
  Notification,
  NotificationPreference,
  NotificationLog,
} from "../../notifications.types";
import { NotificationRepository } from "../repository";
import { adminDb } from "../../firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const NOTIFICATIONS_COLLECTION = "notifications";
const PREFERENCES_COLLECTION = "notification_preferences";
const LOGS_COLLECTION = "notification_logs";

export class FirestoreNotificationRepository implements NotificationRepository {
  private convertDateToTimestamp(obj: unknown): unknown {
    if (obj instanceof Date) {
      return Timestamp.fromDate(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertDateToTimestamp(item));
    }
    if (typeof obj === "object" && obj !== null) {
      const newObj: Record<string, unknown> = {};
      const record = obj as Record<string, unknown>;
      for (const key in record) {
        newObj[key] = this.convertDateToTimestamp(record[key]);
      }
      return newObj;
    }
    return obj;
  }

  private convertTimestampToDate(obj: unknown): unknown {
    if (obj instanceof Timestamp) {
      return obj.toDate();
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.convertTimestampToDate(item));
    }
    if (typeof obj === "object" && obj !== null) {
      const newObj: Record<string, unknown> = {};
      const record = obj as Record<string, unknown>;
      for (const key in record) {
        newObj[key] = this.convertTimestampToDate(record[key]);
      }
      return newObj;
    }
    return obj;
  }

  async createNotification(notification: Notification): Promise<Notification> {
    const data = this.convertDateToTimestamp(notification);
    await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .doc(notification.id)
      .set(data as Record<string, unknown>);
    return notification;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const doc = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .doc(id)
      .get();
    if (!doc.exists) return undefined;
    return this.convertTimestampToDate(doc.data()) as Notification;
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<Notification[]> {
    const snapshot = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("recipientId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(
      (doc) => this.convertTimestampToDate(doc.data()) as Notification,
    );
  }

  async updateNotification(notification: Notification): Promise<Notification> {
    const data = this.convertDateToTimestamp(notification);
    await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .doc(notification.id)
      .set(data as Record<string, unknown>, { merge: true });
    return notification;
  }

  async deleteNotification(id: string): Promise<boolean> {
    await adminDb.collection(NOTIFICATIONS_COLLECTION).doc(id).delete();
    return true;
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    const snapshot = await adminDb
      .collection(PREFERENCES_COLLECTION)
      .where("userId", "==", userId)
      .get();

    return snapshot.docs.map(
      (doc) =>
        this.convertTimestampToDate(doc.data()) as NotificationPreference,
    );
  }

  async savePreference(
    preference: NotificationPreference,
  ): Promise<NotificationPreference> {
    const data = this.convertDateToTimestamp(preference);
    // Use a composite ID or query to find existing preference
    const id = `${preference.userId}_${preference.type}`;
    await adminDb
      .collection(PREFERENCES_COLLECTION)
      .doc(id)
      .set(data as Record<string, unknown>);
    return preference;
  }

  async logNotification(log: NotificationLog): Promise<void> {
    const data = this.convertDateToTimestamp(log);
    await adminDb
      .collection(LOGS_COLLECTION)
      .doc(log.id)
      .set(data as Record<string, unknown>);
  }

  async getLogs(
    notificationId?: string,
    limit: number = 100,
  ): Promise<NotificationLog[]> {
    let query: FirebaseFirestore.Query = adminDb.collection(LOGS_COLLECTION);

    if (notificationId) {
      query = query.where("notificationId", "==", notificationId);
    }

    const snapshot = await query
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();
    return snapshot.docs.map(
      (doc) => this.convertTimestampToDate(doc.data()) as NotificationLog,
    );
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const timestamp = Timestamp.fromDate(date);
    const snapshot = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("createdAt", "<", timestamp)
      .get();

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }

  async getStatistics(
    userId: string,
    days: number = 7,
  ): Promise<Record<string, number>> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const timestamp = Timestamp.fromDate(cutoffDate);

    const query: FirebaseFirestore.Query = adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("createdAt", ">", timestamp)
      .where("recipientId", "==", userId)
      .limit(500);

    const snapshot = await query.get();
    const notifications = snapshot.docs.map((doc) => doc.data());

    return {
      total: notifications.length,
      pending: notifications.filter((n) => n.status === "pending").length,
      sent: notifications.filter((n) => n.status === "sent").length,
      delivered: notifications.filter((n) => n.status === "delivered").length,
      read: notifications.filter((n) => n.status === "read").length,
      failed: notifications.filter((n) => n.status === "failed").length,
    };
  }
}
