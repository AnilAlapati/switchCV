/**
 * Handlers for recruiter-request lifecycle emails.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { emailService } from "../services/emailService";
import {
  auditLogger,
  AuditAction,
  ResourceType,
} from "../services/auditLogger";

export const onRecruiterRequestCreatedHandler = async (
  snap: functions.firestore.QueryDocumentSnapshot,
  context: functions.EventContext,
): Promise<void> => {
  try {
    const request = snap.data();
    const toUserId = request.toUserId;
    const candidateDoc = await admin
      .firestore()
      .collection("users")
      .doc(toUserId)
      .get();
    const candidateEmail = candidateDoc.data()?.email;

    if (!candidateEmail) {
      throw new Error("Candidate email not found");
    }

    const recruiterDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.fromRecruiter.recruiterId)
      .get();
    const recruiterName = recruiterDoc.data()?.companyName || "A Recruiter";

    const result = await emailService.sendEmail({
      to: candidateEmail,
      template: "recruiterRequest",
      data: {
        companyName: request.fromRecruiter.companyName || recruiterName,
        position: request.position || "Not specified",
        message: request.message || "",
        dashboardUrl: `${process.env.WEBSITE_URL}/dashboard`,
      },
    });

    if (result.success) {
      await auditLogger.logRecruiterRequest(
        context.params.requestId,
        request.fromRecruiter.recruiterId,
        toUserId,
        AuditAction.RECRUITER_REQUEST_CREATED,
      );
    }
  } catch (error) {
    functions.logger.error("Error sending recruiter request email:", error);
    await auditLogger.log({
      userId: "system",
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.RECRUITER_REQUEST,
      resourceId: context.params.requestId,
      details: `Failed to send recruiter request email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      status: "failure",
    });
  }
};

export const onRecruiterRequestApprovedHandler = async (
  change: functions.Change<functions.firestore.QueryDocumentSnapshot>,
  context: functions.EventContext,
): Promise<void> => {
  try {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger if status changed to approved
    if (before.status !== "approved" && after.status === "approved") {
      const recruiterDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.fromRecruiter.recruiterId)
        .get();
      const recruiterEmail = recruiterDoc.data()?.email;

      if (!recruiterEmail) {
        throw new Error("Recruiter email not found");
      }

      const candidateDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.toUserId)
        .get();
      const candidateName = candidateDoc.data()?.firstName || "Candidate";

      const result = await emailService.sendEmail({
        to: recruiterEmail,
        template: "requestApproved",
        data: {
          candidateName,
          profileUrl: `${process.env.WEBSITE_URL}/profile/${after.toUserId}`,
        },
      });

      if (result.success) {
        await auditLogger.logRecruiterRequest(
          context.params.requestId,
          after.fromRecruiter.recruiterId,
          after.toUserId,
          AuditAction.RECRUITER_REQUEST_APPROVED,
          true,
        );
      }
    }

    // Trigger if status changed to denied
    if (before.status !== "denied" && after.status === "denied") {
      const recruiterDoc = await admin
        .firestore()
        .collection("users")
        .doc(after.fromRecruiter.recruiterId)
        .get();
      const recruiterEmail = recruiterDoc.data()?.email;

      if (!recruiterEmail) {
        throw new Error("Recruiter email not found");
      }

      const result = await emailService.sendEmail({
        to: recruiterEmail,
        template: "requestDenied",
        data: {
          dashboardUrl: `${process.env.WEBSITE_URL}/recruiter/dashboard`,
        },
      });

      if (result.success) {
        await auditLogger.logRecruiterRequest(
          context.params.requestId,
          after.fromRecruiter.recruiterId,
          after.toUserId,
          AuditAction.RECRUITER_REQUEST_DENIED,
          false,
        );
      }
    }
  } catch (error) {
    functions.logger.error("Error sending request status email:", error);
    await auditLogger.log({
      userId: "system",
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.RECRUITER_REQUEST,
      resourceId: context.params.requestId,
      details: `Failed to send status update email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      status: "failure",
    });
  }
};
