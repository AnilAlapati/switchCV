import { useCallback } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

/**
 * Hook for client-side audit logging
 * Tracks important user actions for analytics and security
 */

export enum ClientAuditAction {
  // Profile actions
  PROFILE_VIEW = "PROFILE_VIEW",
  PROFILE_CREATED = "PROFILE_CREATED",
  PROFILE_UPDATED = "PROFILE_UPDATED",
  PROFILE_SHARED = "PROFILE_SHARED",

  // Resume actions
  RESUME_CREATED = "RESUME_CREATED",
  RESUME_UPDATED = "RESUME_UPDATED",
  RESUME_VIEWED = "RESUME_VIEWED",
  RESUME_DOWNLOADED = "RESUME_DOWNLOADED",

  // Recruiter actions
  REQUEST_SENT = "REQUEST_SENT",
  REQUEST_REVIEWED = "REQUEST_REVIEWED",
  REQUEST_APPROVED = "REQUEST_APPROVED",
  REQUEST_DENIED = "REQUEST_DENIED",

  // User actions
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  SETTINGS_CHANGED = "SETTINGS_CHANGED",

  // Feature usage
  SEARCH_PERFORMED = "SEARCH_PERFORMED",
  FILTER_APPLIED = "FILTER_APPLIED",
  ANALYTICS_VIEWED = "ANALYTICS_VIEWED",
}

interface AuditLogData {
  action: ClientAuditAction;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export const useAuditLog = () => {
  const logAction = useCallback(async (data: AuditLogData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.warn("No authenticated user for audit log");
        return;
      }

      // Create audit log entry
      await addDoc(collection(db, "clientAuditLogs"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId || null,
        metadata: data.metadata || {},
        timestamp: Timestamp.now(),
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
        url: typeof window !== "undefined" ? window.location.href : null,
      });

      console.log(`[AUDIT] ${data.action} - ${data.resourceType}`);
    } catch (error) {
      console.error("Failed to log audit action:", error);
      // Don't throw - audit logging shouldn't break functionality
    }
  }, []);

  const logProfileView = useCallback(
    (profileId: string, metadata?: Record<string, any>) => {
      return logAction({
        action: ClientAuditAction.PROFILE_VIEW,
        resourceType: "profile",
        resourceId: profileId,
        metadata,
      });
    },
    [logAction]
  );

  const logResumeView = useCallback(
    (resumeId: string, metadata?: Record<string, any>) => {
      return logAction({
        action: ClientAuditAction.RESUME_VIEWED,
        resourceType: "resume",
        resourceId: resumeId,
        metadata,
      });
    },
    [logAction]
  );

  const logRequestSent = useCallback(
    (requestId: string, candidateId: string) => {
      return logAction({
        action: ClientAuditAction.REQUEST_SENT,
        resourceType: "recruiterRequest",
        resourceId: requestId,
        metadata: { candidateId },
      });
    },
    [logAction]
  );

  const logSearch = useCallback(
    (query: string, filters?: Record<string, any>) => {
      return logAction({
        action: ClientAuditAction.SEARCH_PERFORMED,
        resourceType: "search",
        metadata: { query, filters },
      });
    },
    [logAction]
  );

  return {
    logAction,
    logProfileView,
    logResumeView,
    logRequestSent,
    logSearch,
  };
};

/**
 * Hook for email notification preferences
 */
interface NotificationPreferences {
  recruiterRequests: boolean;
  profileViews: boolean;
  weeklyDigest: boolean;
  adminAlerts: boolean;
}

export const useNotificationPreferences = () => {
  const currentUser = auth.currentUser;

  const getPreferences =
    useCallback(async (): Promise<NotificationPreferences | null> => {
      if (!currentUser) return null;

      try {
        const userDoc = await (
          await import("firebase/firestore").then((m) => m.getDoc)
        )(
          (
            await import("firebase/firestore").then((m) => m.doc)
          )(db, "users", currentUser.uid)
        );

        return (
          userDoc.data()?.notificationPreferences || {
            recruiterRequests: true,
            profileViews: true,
            weeklyDigest: true,
            adminAlerts: true,
          }
        );
      } catch (error) {
        console.error("Failed to get notification preferences:", error);
        return null;
      }
    }, [currentUser]);

  const updatePreferences = useCallback(
    async (preferences: Partial<NotificationPreferences>) => {
      if (!currentUser) {
        throw new Error("No authenticated user");
      }

      try {
        const { updateDoc, doc } = await import("firebase/firestore");
        await updateDoc(doc(db, "users", currentUser.uid), {
          notificationPreferences: preferences,
          updatedAt: Timestamp.now(),
        });

        return true;
      } catch (error) {
        console.error("Failed to update notification preferences:", error);
        throw error;
      }
    },
    [currentUser]
  );

  return { getPreferences, updatePreferences };
};

/**
 * Hook for accessing personal audit logs
 */
export const usePersonalAuditLogs = () => {
  const currentUser = auth.currentUser;

  const getMyAuditLogs = useCallback(
    async (limit: number = 50) => {
      if (!currentUser) return [];

      try {
        const {
          query,
          where,
          orderBy,
          limit: limitFn,
        } = await import("firebase/firestore");
        const { getDocs } = await import("firebase/firestore");

        const q = query(
          collection(db, "auditLogs"),
          where("userId", "==", currentUser.uid),
          orderBy("timestamp", "desc"),
          limitFn(limit)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return [];
      }
    },
    [currentUser]
  );

  const exportMyData = useCallback(async () => {
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    try {
      // Call backend function to export data
      const { httpsCallable } = await import("firebase/functions");
      const { functions } = await import("@/lib/firebase");

      const exportData = httpsCallable(functions, "exportUserData");
      const result = await exportData({ userId: currentUser.uid });

      return result.data;
    } catch (error) {
      console.error("Failed to export data:", error);
      throw error;
    }
  }, [currentUser]);

  return { getMyAuditLogs, exportMyData };
};
