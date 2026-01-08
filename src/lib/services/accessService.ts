import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "@/lib/notifications.types";
import { createNotification } from "@/lib/notificationService";
import { getRecruiterContactLimits } from "@/lib/config.server";
import { SubscriptionTier } from "@/lib/config.client";
import { updateRecruiterAccessMetric } from "@/lib/services/metricsService";
import { AccessCheckResponse } from "@/types/profileSearch";

export interface AccessRequestInput {
  requesterId: string;
  requesterName: string;
  resumeId: string;
  message?: string;
  durationLabel: string;
  durationDays: number; // Normalized duration in days
}

export class AccessService {
  /**
   * Create a new access request
   */
  static async requestAccess(input: AccessRequestInput) {
    const {
      requesterId,
      requesterName,
      resumeId,
      message,
      durationLabel,
      durationDays,
    } = input;

    // 1. Get Requester Info & Limits
    const userDoc = await adminDb.collection("users").doc(requesterId).get();
    if (!userDoc.exists) throw new Error("User not found");
    const userData = userDoc.data()!;

    // Enforce Company Name
    const companyName = userData.companyName || userData.company;
    if (!companyName || !companyName.trim()) {
      throw new Error("Company name is required to request access.");
    }

    // Check Limits
    const rawTier = userData.subscriptionTier || "basic";
    const tier = ["basic", "premium", "enterprise"].includes(rawTier)
      ? (rawTier as SubscriptionTier)
      : "basic";
    const limits = await getRecruiterContactLimits();
    const limitConfig = limits[tier];

    if (limitConfig.amount < 9999) {
      let query = adminDb
        .collectionGroup("accessRequests")
        .where("fromUserId", "==", requesterId);

      if (limitConfig.interval === "month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        query = query.where("timestamp", ">=", startOfMonth);
      }

      const snap = await query.get();
      if (snap.size >= limitConfig.amount) {
        const period =
          limitConfig.interval === "month" ? "this month" : "total";
        throw new Error(
          `Limit reached: ${limitConfig.amount} requests ${period}. Upgrade plan.`
        );
      }
    }

    // 2. Validate Target Resume
    const resumeRef = adminDb.collection("resumes").doc(resumeId);
    const resumeDoc = await resumeRef.get();
    if (!resumeDoc.exists) throw new Error("Resume not found");
    const resumeOwnerId = resumeDoc.data()!.userId;

    if (resumeOwnerId === requesterId)
      throw new Error("Cannot request access to own resume");

    // 3. Check for existing grants/requests
    let existingRequests;
    try {
      existingRequests = await resumeRef
        .collection("accessRequests")
        .where("fromUserId", "==", requesterId)
        .where("status", "==", "pending")
        .get();
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err.code === 9 || err.message?.toLowerCase().includes("index")) {
        logger.warn(
          "Missing Firestore index for accessRequests, falling back to full collection scan",
          { resumeId, requesterId }
        );
        const allRequests = await resumeRef.collection("accessRequests").get();
        const filteredDocs = allRequests.docs.filter((doc) => {
          const d = doc.data();
          return d.fromUserId === requesterId && d.status === "pending";
        });
        existingRequests = {
          docs: filteredDocs,
          empty: filteredDocs.length === 0,
          size: filteredDocs.length,
        };
      } else {
        throw err;
      }
    }

    if (!existingRequests.empty)
      throw new Error("Pending request already exists");

    let activeGrants;
    try {
      activeGrants = await resumeRef
        .collection("accessGrants")
        .where("toUserId", "==", requesterId)
        .get();
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err.code === 9 || err.message?.toLowerCase().includes("index")) {
        logger.warn(
          "Missing Firestore index for accessGrants, falling back to full collection scan",
          { resumeId, requesterId }
        );
        activeGrants = await resumeRef.collection("accessGrants").get();
        const filteredDocs = activeGrants.docs.filter(
          (doc) => doc.data().toUserId === requesterId
        );
        activeGrants = {
          docs: filteredDocs,
          empty: filteredDocs.length === 0,
          size: filteredDocs.length,
        };
      } else {
        throw err;
      }
    }

    const now = new Date();
    const hasActive = activeGrants.docs.some((doc) => {
      const data = doc.data();
      if (!data.expiresAt) return true; // Forever
      const expires = data.expiresAt.toDate
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt);
      return expires > now;
    });

    if (hasActive) throw new Error("Already have access");

    // 4. Create Request
    const requestData = {
      fromUserId: requesterId,
      fromUserName: requesterName,
      timestamp: FieldValue.serverTimestamp(),
      message: message || "",
      status: "pending",
      requestedDuration: {
        label: durationLabel,
        value: durationDays,
      },
    };

    const requestRef = await resumeRef
      .collection("accessRequests")
      .add(requestData);

    // 5. Side Effects (Notifications, Metrics)
    await updateRecruiterAccessMetric(requesterId, "pending", 1);

    await adminDb
      .collection("jobSeekerMetrics")
      .doc(resumeOwnerId)
      .set(
        {
          contactRequests: FieldValue.increment(1),
          lastActivityAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    await createNotification(
      NotificationType.ACCESS_REQUEST,
      resumeOwnerId,
      {
        title: "Resume Access Request",
        body: `${requesterName} requested ${durationLabel} of resume access`,
        actionUrl: `/dashboard/access-requests`,
        data: { requestId: requestRef.id, resumeId, fromUserId: requesterId },
      },
      [NotificationChannel.IN_APP],
      NotificationPriority.HIGH
    );

    logger.info(
      { requestId: requestRef.id, requesterId, resumeId },
      "Access request created via service"
    );
    return { requestId: requestRef.id };
  }

  /**
   * Respond to an access request (Approve/Deny)
   */
  static async respondToRequest(
    currUserId: string,
    resumeId: string,
    requestId: string,
    action: "approve" | "deny",
    grantDurationDays?: number // Optional override
  ) {
    // 1. Verify Ownership
    const resumeRef = adminDb.collection("resumes").doc(resumeId);
    const resumeDoc = await resumeRef.get();
    if (!resumeDoc.exists) throw new Error("Resume not found");
    if (resumeDoc.data()!.userId !== currUserId)
      throw new Error("Unauthorized");

    const requestRef = resumeRef.collection("accessRequests").doc(requestId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) throw new Error("Request not found");

    const requestData = requestDoc.data()!;
    if (requestData.status !== "pending")
      throw new Error("Request already processed");
    const requesterId = requestData.fromUserId;

    if (action === "deny") {
      await requestRef.update({
        status: "denied",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Notify Requester
      await createNotification(
        NotificationType.ACCESS_GRANTED,
        requesterId,
        {
          title: "Access Request Denied",
          body: "Your request for access has been denied.",
          data: { resumeId, status: "denied" },
        },
        [NotificationChannel.IN_APP]
      );

      return { status: "denied" };
    }

    // Approve
    const durationValue =
      grantDurationDays || requestData.requestedDuration?.value || 30; // Default 30 days if missing
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationValue);

    await adminDb.runTransaction(async (t) => {
      // Update request
      t.update(requestRef, {
        status: "approved",
        updatedAt: FieldValue.serverTimestamp(),
        grantedDuration: {
          value: durationValue,
          label: `${durationValue} days`,
        },
      });

      // Create Grant
      const grantRef = resumeRef.collection("accessGrants").doc();
      t.set(grantRef, {
        toUserId: requesterId,
        grantedAt: FieldValue.serverTimestamp(),
        expiresAt: expiresAt,
        originalRequestId: requestId,
      });

      // Update user permission/contact list if needed (omitted for now as accessGrants handles it)
    });

    // Notifications & Metrics
    await updateRecruiterAccessMetric(requesterId, "approved", 1);
    await updateRecruiterAccessMetric(requesterId, "pending", -1); // Decrement pending

    await createNotification(
      NotificationType.ACCESS_GRANTED,
      requesterId,
      {
        title: "Access Request Approved",
        body: "Your access request has been approved!",
        actionUrl: `/resumes/${resumeId}`,
        data: { resumeId, status: "approved" },
      },
      [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      NotificationPriority.HIGH
    );

    return { status: "approved", expiresAt };
  }

  /**
   * Check if a user has access to a resume
   */
  static async checkAccessStatus(
    userId: string,
    resumeId: string
  ): Promise<AccessCheckResponse> {
    // 1. Get Resume
    const resumeRef = adminDb.collection("resumes").doc(resumeId);
    const resumeDoc = await resumeRef.get();
    if (!resumeDoc.exists) throw new Error("Resume not found");

    const resumeData = resumeDoc.data()!;

    // Owner Check
    if (resumeData.userId === userId) {
      return { hasAccess: true, accessType: "owner", message: "Owner" };
    }

    // Public Check
    if (resumeData.published) {
      return {
        hasAccess: true,
        accessType: "public",
        message: "Publicly shared",
      };
    }

    // Grant Check
    const grantsSnapshot = await resumeRef
      .collection("accessGrants")
      .where("toUserId", "==", userId)
      .get();

    const now = new Date();
    for (const doc of grantsSnapshot.docs) {
      const data = doc.data();
      const expires = data.expiresAt?.toDate
        ? data.expiresAt.toDate()
        : data.expiresAt
        ? new Date(data.expiresAt)
        : null;

      if (!expires || expires > now) {
        return {
          hasAccess: true,
          accessType: "granted",
          grantId: doc.id,
          expiresAt: expires || undefined,
          message: expires
            ? `Expires ${expires.toLocaleDateString()}`
            : "Permanent access",
        };
      }
    }

    return { hasAccess: false, accessType: "none", message: "No access" };
  }
}
