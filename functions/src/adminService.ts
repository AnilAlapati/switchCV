import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const SERVER_ROLE_MARKER = "system";
const ADMIN_WHITELIST_SOURCE = "admin_whitelist";
const AUDIT_COLLECTION = "audit";

type AdminRole = "admin" | "jobseeker";
type WhitelistAction = "grant" | "revoke";
type WhitelistOutcome = "applied" | "denied" | "skipped" | "failed";
type WhitelistData = Record<string, unknown>;

interface ApprovalCheck {
  approved: boolean;
  approverUid?: string;
  reason?: string;
}

interface AuditEvent {
  action: WhitelistAction;
  outcome: WhitelistOutcome;
  targetEmail: string;
  targetUid?: string;
  approverUid?: string;
  reason?: string;
  eventId?: string;
}

function snapshotData(
  snapshot: functions.firestore.DocumentSnapshot,
): WhitelistData {
  return snapshot.data() ?? {};
}

function stringField(data: WhitelistData, field: string): string | undefined {
  const value = data[field];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function booleanField(data: WhitelistData, field: string): boolean {
  return data[field] === true;
}

function hasApprovalTimestamp(data: WhitelistData, field: string): boolean {
  return data[field] !== undefined && data[field] !== null;
}

function isUserNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "auth/user-not-found"
  );
}

async function writeAuditEvent(
  db: admin.firestore.Firestore,
  event: AuditEvent,
): Promise<void> {
  const auditId = `${event.eventId || Date.now()}-${event.action}`;
  await db
    .collection("system")
    .doc("admins")
    .collection(AUDIT_COLLECTION)
    .doc(auditId)
    .set(
      {
        ...event,
        source: ADMIN_WHITELIST_SOURCE,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function verifyExistingAdmin(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  approverUid: string,
): Promise<boolean> {
  const [approverRecord, approverDoc] = await Promise.all([
    auth.getUser(approverUid),
    db.collection("users").doc(approverUid).get(),
  ]);

  const claimRole = approverRecord.customClaims?.role;
  const firestoreRole = approverDoc.data()?.role;
  const isVerified = claimRole === "admin" && firestoreRole === "admin";

  if (!isVerified) {
    functions.logger.warn("Admin whitelist approver failed dual verification", {
      approverUid,
      claimRole,
      firestoreRole,
    });
  }

  return isVerified;
}

async function requireApproval(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  data: WhitelistData,
  targetUid: string,
  action: WhitelistAction,
): Promise<ApprovalCheck> {
  const approvedField = action === "grant" ? "approved" : "revokeApproved";
  const approverField =
    action === "grant" ? "approvedByUid" : "revokeApprovedByUid";
  const approvedAtField =
    action === "grant" ? "approvedAt" : "revokeApprovedAt";

  if (!booleanField(data, approvedField)) {
    return { approved: false, reason: `${approvedField} must be true` };
  }

  if (!hasApprovalTimestamp(data, approvedAtField)) {
    return { approved: false, reason: `${approvedAtField} is required` };
  }

  const approverUid = stringField(data, approverField);
  if (!approverUid) {
    return { approved: false, reason: `${approverField} is required` };
  }

  if (approverUid === targetUid) {
    return { approved: false, approverUid, reason: "self-approval is blocked" };
  }

  const approverIsAdmin = await verifyExistingAdmin(auth, db, approverUid);
  if (!approverIsAdmin) {
    return {
      approved: false,
      approverUid,
      reason: "approver is not verified as admin in both Auth and Firestore",
    };
  }

  return { approved: true, approverUid };
}

async function applyRole(
  auth: admin.auth.Auth,
  db: admin.firestore.Firestore,
  userRecord: admin.auth.UserRecord,
  role: AdminRole,
): Promise<void> {
  const uid = userRecord.uid;
  const userRef = db.collection("users").doc(uid);
  const existingClaims = userRecord.customClaims || {};

  await userRef.set(
    {
      role,
      roleUpdatedBy: SERVER_ROLE_MARKER,
      roleUpdateSource: ADMIN_WHITELIST_SOURCE,
      roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await auth.setCustomUserClaims(uid, { ...existingClaims, role });

  const [verifiedRecord, verifiedDoc] = await Promise.all([
    auth.getUser(uid),
    userRef.get(),
  ]);

  const claimRole = verifiedRecord.customClaims?.role;
  const firestoreRole = verifiedDoc.data()?.role;
  if (claimRole !== role || firestoreRole !== role) {
    throw new Error(
      `Role verification failed after ${role} update: claim=${claimRole}, firestore=${firestoreRole}`,
    );
  }
}

async function findTargetUser(
  auth: admin.auth.Auth,
  targetEmail: string,
): Promise<admin.auth.UserRecord | null> {
  try {
    return await auth.getUserByEmail(targetEmail);
  } catch (error) {
    if (isUserNotFound(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Sync Admin Whitelist.
 *
 * Watches `system/admins/whitelist/{email}`:
 * - approved create/update grants admin when approved by an existing dual-verified admin
 * - approved delete revokes admin when the deleted doc contains revoke approval fields
 */
export const syncAdminWhitelistHandler = async (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
  context: functions.EventContext,
) => {
  const email = context.params.email;
  if (!email) return;

  const targetEmail = email.toLowerCase().trim();
  const auth = admin.auth();
  const db = admin.firestore();
  const afterData = change.after.exists ? snapshotData(change.after) : {};
  const beforeData = change.before.exists ? snapshotData(change.before) : {};

  if (change.after.exists && stringField(afterData, "status") === "granted") {
    return;
  }

  const action: WhitelistAction = change.after.exists ? "grant" : "revoke";
  const actionData = change.after.exists ? afterData : beforeData;
  const targetEmailField = stringField(actionData, "email");

  if (targetEmailField && targetEmailField.toLowerCase() !== targetEmail) {
    await writeAuditEvent(db, {
      action,
      outcome: "denied",
      targetEmail,
      reason: "document email field does not match whitelist document id",
      eventId: context.eventId,
    });
    return;
  }

  try {
    const userRecord = await findTargetUser(auth, targetEmail);
    if (!userRecord) {
      functions.logger.warn("Admin whitelist target user not found", {
        targetEmail,
      });
      await writeAuditEvent(db, {
        action,
        outcome: "skipped",
        targetEmail,
        reason: "target user not found",
        eventId: context.eventId,
      });
      return;
    }

    const approval = await requireApproval(
      auth,
      db,
      actionData,
      userRecord.uid,
      action,
    );

    if (!approval.approved) {
      functions.logger.warn("Admin whitelist change denied", {
        targetEmail,
        targetUid: userRecord.uid,
        action,
        approverUid: approval.approverUid,
        reason: approval.reason,
      });
      await writeAuditEvent(db, {
        action,
        outcome: "denied",
        targetEmail,
        targetUid: userRecord.uid,
        approverUid: approval.approverUid,
        reason: approval.reason,
        eventId: context.eventId,
      });
      return;
    }

    const nextRole: AdminRole = action === "grant" ? "admin" : "jobseeker";
    functions.logger.info("Admin whitelist role change approved", {
      targetEmail,
      targetUid: userRecord.uid,
      approverUid: approval.approverUid,
      action,
      nextRole,
    });

    await applyRole(auth, db, userRecord, nextRole);

    if (change.after.exists) {
      await change.after.ref.set(
        {
          status: "granted",
          targetUid: userRecord.uid,
          grantAppliedAt: admin.firestore.FieldValue.serverTimestamp(),
          grantAppliedBy: ADMIN_WHITELIST_SOURCE,
        },
        { merge: true },
      );
    }

    await writeAuditEvent(db, {
      action,
      outcome: "applied",
      targetEmail,
      targetUid: userRecord.uid,
      approverUid: approval.approverUid,
      eventId: context.eventId,
    });
  } catch (error) {
    functions.logger.error("Admin whitelist role sync failed", {
      targetEmail,
      action,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    await writeAuditEvent(db, {
      action,
      outcome: "failed",
      targetEmail,
      reason: error instanceof Error ? error.message : "Unknown error",
      eventId: context.eventId,
    });
  }
};
