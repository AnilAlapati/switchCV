import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

/**
 * Sync user role from Firestore to Auth Custom Claims
 * This allows security rules to check request.auth.token.role instead of reading the user doc
 */
export const onUserRoleChanged = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const newData = change.after.data();
    const oldData = change.before.data();

    // If document was deleted, remove claims
    if (!newData) {
      await admin.auth().setCustomUserClaims(userId, null);
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

      console.log(`Updated custom claims for user ${userId} to role: ${role}`);
    } catch (error) {
      console.error(`Error updating custom claims for user ${userId}:`, error);
    }
  });
