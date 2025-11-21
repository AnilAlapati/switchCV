import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Aggregate global statistics (users, resumes) periodically.
 * Runs every hour.
 */
export const aggregateGlobalStats = functions.pubsub
  .schedule("0 * * * *") // Every hour
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("📊 Starting global stats aggregation...");
    const db = admin.firestore();

    try {
      // Count users
      const usersSnap = await db.collection("users").count().get();
      const userCount = usersSnap.data().count;

      // Count published resumes
      const resumesSnap = await db
        .collection("resumeProfiles")
        .where("published", "==", true)
        .count()
        .get();
      const resumeCount = resumesSnap.data().count;

      // Update global stats document
      await db.collection("analytics").doc("globalStats").set(
        {
          userCount,
          resumeCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(
        `✅ Global stats updated: ${userCount} users, ${resumeCount} published resumes`
      );
      return null;
    } catch (error) {
      console.error("Error aggregating global stats:", error);
      return null;
    }
  });
