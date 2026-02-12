import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { checkRateLimit, RateLimitPresets } from "./middleware/rateLimiter";

const SERVER_ROLE_MARKER = "system";
const ALLOWED_ROLES = ["jobseeker", "recruiter", "admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isServerManagedRoleChange(
  data: Record<string, unknown> | undefined | null
) {
  if (!data) {
    return false;
  }
  const marker = (data as { roleUpdatedBy?: string }).roleUpdatedBy;
  return marker === SERVER_ROLE_MARKER;
}

/**
 * Sync user role from Firestore to Auth Custom Claims
 * This allows security rules to check request.auth.token.role instead of reading the user doc
 */
const onUserRoleChangedHandler = async (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
  context: functions.EventContext
) => {
  const userId = context.params.userId;
  const newData = change.after.data();
  const oldData = change.before.data();

  // If document was deleted, remove claims
  if (!newData) {
    await admin.auth().setCustomUserClaims(userId, null);
    return;
  }

  // Only honor role updates that were stamped by the backend callable
  if (!isServerManagedRoleChange(newData)) {
    functions.logger.warn("Ignoring client-side role update", {
      userId,
      attemptedRole: newData.role,
    });
    return;
  }

  // If role hasn't changed, do nothing
  if (newData.role === oldData?.role) {
    return;
  }

  const role = newData.role;

  // Set custom user claims
  try {
    // Preserve existing claims if any, or just overwrite?
    // Usually safer to merge, but for now we just set role.
    // Let's get existing claims first to be safe.
    const userRecord = await admin.auth().getUser(userId);
    const existingClaims = userRecord.customClaims || {};

    await admin.auth().setCustomUserClaims(userId, {
      ...existingClaims,
      role: role,
    });

    functions.logger.info(`Updated custom claims for user ${userId} to role: ${role}`);
  } catch (error) {
    functions.logger.error(`Error updating custom claims for user ${userId}:`, error);
  }
};

export { onUserRoleChangedHandler };

export const onUserRoleChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(onUserRoleChangedHandler);

const setUserRoleHandler = async (
  data: { userId?: string; role?: AllowedRole },
  context: functions.https.CallableContext
) => {
  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can change user roles."
    );
  }

  // Rate limiting for admin actions
  const rateLimit = await checkRateLimit(
    context.auth.uid,
    RateLimitPresets.ADMIN
  );
  if (!rateLimit.allowed) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`
    );
  }

  const { userId, role } = data;

  if (!userId || typeof userId !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "A valid userId is required."
    );
  }

  if (!role || !ALLOWED_ROLES.includes(role)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Role must be one of: ${ALLOWED_ROLES.join(", ")}.`
    );
  }

  const db = admin.firestore();
  const userRef = db.collection("users").doc(userId);

  await userRef.set(
    {
      role,
      roleUpdatedBy: SERVER_ROLE_MARKER,
      roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const userRecord = await admin.auth().getUser(userId);
  const existingClaims = userRecord.customClaims || {};

  await admin.auth().setCustomUserClaims(userId, {
    ...existingClaims,
    role,
  });

  functions.logger.info("Role updated via callable", { userId, role });

  return { success: true, role };
};

export { setUserRoleHandler };

export const setUserRole = functions.https.onCall(setUserRoleHandler);
