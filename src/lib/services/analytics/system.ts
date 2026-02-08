import { adminDb } from "@/lib/firebase-admin";
import { SystemAnalytics } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Get system-wide analytics (Admin/Recruiter only)
 */
export async function getSystemAnalytics(
    requestingUserId: string
): Promise<SystemAnalytics> {
    // Check permission
    const userDoc = await adminDb.collection("users").doc(requestingUserId).get();
    if (!userDoc.exists) throw new Error("User not found");
    const role = userDoc.data()?.role;

    if (role !== "admin" && role !== "recruiter") {
        throw new Error("Unauthorized");
    }


    // 1. Aggregations (Fast & Bounded)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { AggregateField } = await import("firebase-admin/firestore");

    // Run queries that don't require composite indexes
    const [
        totalUsersSnap,
        totalResumesSnap,
        totalRequestsSnap,
        basicSubsSnap,
        premiumSubsSnap,
        entSubsSnap,
        recentResumesForInd,
    ] = await Promise.all([
        adminDb.collection("users").count().get(),
        adminDb.collection("resumes").count().get(),
        adminDb.collection("contactRequests").count().get(),
        adminDb.collection("users").where("tier", "==", "basic").count().get(),
        adminDb.collection("users").where("tier", "==", "premium").count().get(),
        adminDb.collection("users").where("tier", "==", "enterprise").count().get(),
        adminDb.collection("resumes").orderBy("createdAt", "desc").limit(500).get(),
    ]);

    // Active recruiters query requires composite index - wrap in try-catch
    let activeRecruitersCount = 0;
    try {
        const activeRecruitersSnap = await adminDb
            .collection("users")
            .where("role", "in", ["recruiter", "admin"])
            .where("lastLoginAt", ">=", thirtyDaysAgo)
            .count()
            .get();
        activeRecruitersCount = activeRecruitersSnap.data().count;
    } catch (error) {
        // Index missing - log warning but continue with 0
        logger.warn({ err: error }, "Active recruiters query failed - composite index may be missing");
    }

    // Safely fetch aggregations (can fail if indexes are missing)
    let totalViews = 0;
    let averageAttractiveness = 0;

    try {
        const analyticsAggSnap = await adminDb
            .collection("analytics")
            .aggregate({
                totalViews: AggregateField.sum("views.count"),
                avgAttract: AggregateField.average("attractivenessScore"),
            })
            .get();

        totalViews = analyticsAggSnap.data().totalViews || 0;
        averageAttractiveness = Math.round(analyticsAggSnap.data().avgAttract || 0);
    } catch (error) {
        // Log detailed error for admin to fix (usually missing index)
        logger.warn({ err: error }, "Analytics aggregation failed - composite index may be missing. Continuing with default values.");
        // Continue with default 0 values so dashboard doesn't crash
    }

    // Process Industries (Sampled)
    const industriesCounts: Record<string, number> = {};
    recentResumesForInd.forEach((doc) => {
        const data = doc.data();
        const industry = data.industry || data.targetIndustry || "Other";
        industriesCounts[industry] = (industriesCounts[industry] || 0) + 1;
    });

    const topIndustries = Object.entries(industriesCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Recent Activity
    const recentActivity: Array<{
        type: string;
        timestamp: Date;
        description: string;
    }> = [];

    // Reuse logic for recent items, but ensuring limits
    const recentResumes = await adminDb
        .collection("resumes")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

    recentResumes.forEach((doc) => {
        const data = doc.data();
        recentActivity.push({
            type: "resume_created",
            timestamp: data.createdAt?.toDate?.() || new Date(),
            description: `New resume created: ${data.title || "Untitled"}`,
        });
    });

    const recentRequests = await adminDb
        .collection("contactRequests")
        .orderBy("createdAt", "desc")
        .limit(5)
        .get();

    recentRequests.forEach((doc) => {
        const data = doc.data();
        recentActivity.push({
            type: "contact_request",
            timestamp: data.createdAt?.toDate?.() || new Date(),
            description: `Contact request ${data.status || "pending"}`,
        });
    });

    recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
        totalUsers: totalUsersSnap.data().count,
        totalResumes: totalResumesSnap.data().count,
        activeRecruiters: activeRecruitersCount,
        totalViews,
        averageAttractiveness,
        totalContactRequests: totalRequestsSnap.data().count,
        topIndustries,
        recentActivity: recentActivity.slice(0, 10),
        subscriptionDistribution: {
            basic: basicSubsSnap.data().count,
            premium: premiumSubsSnap.data().count,
            enterprise: entSubsSnap.data().count,
        },
    };
}
