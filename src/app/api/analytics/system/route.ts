// System-wide Analytics API - Admin and Recruiter Only

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

interface SystemAnalytics {
  totalUsers: number;
  totalResumes: number;
  activeRecruiters: number;
  totalViews: number;
  totalContactRequests: number;
  averageAttractiveness: number;
  topIndustries: Array<{ name: string; count: number }>;
  recentActivity: Array<{ type: string; timestamp: Date; description: string }>;
  subscriptionDistribution: {
    basic: number;
    premium: number;
    enterprise: number;
  };
}

/**
 * GET /api/analytics/system
 * Fetch system-wide analytics (admin/recruiter only)
 */
export async function GET(request: NextRequest) {
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError || !userId) {
    return authError || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check user role - only admin and recruiter can access
    const userDoc = await adminDb.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data()!;
    const userRole = userData.role;

    if (userRole !== "admin" && userRole !== "recruiter") {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Only admins and recruiters can access system analytics.",
        },
        { status: 403 }
      );
    }

    // Fetch analytics data from Firestore
    const [
      usersSnapshot,
      resumesSnapshot,
      analyticsSnapshot,
      contactRequestsSnapshot,
    ] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("resumes").get(),
      adminDb.collection("analytics").get(),
      adminDb.collection("contactRequests").get(),
    ]);

    // Count active recruiters (users with recruiter role who have logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let activeRecruiters = 0;
    const subscriptionDistribution = { basic: 0, premium: 0, enterprise: 0 };
    const industriesCounts: Record<string, number> = {};

    usersSnapshot.forEach((doc) => {
      const data = doc.data();

      // Count active recruiters
      if (data.role === "recruiter" || data.role === "admin") {
        const lastLogin = data.lastLoginAt?.toDate?.() || (typeof data.lastLoginAt?.toDate === 'function' ? data.lastLoginAt.toDate() : null);
        if (lastLogin && lastLogin >= thirtyDaysAgo) {
          activeRecruiters++;
        }
      }

      // Count subscription distribution
      const tier = data.tier || "basic";
      if (tier === "basic") subscriptionDistribution.basic++;
      else if (tier === "premium") subscriptionDistribution.premium++;
      else if (tier === "enterprise") subscriptionDistribution.enterprise++;
    });

    // Calculate total views and average attractiveness
    let totalViews = 0;
    let totalAttractiveness = 0;
    let resumeCount = 0;

    analyticsSnapshot.forEach((doc) => {
      const data = doc.data();
      totalViews += data.viewCount || 0;
      totalAttractiveness += data.attractivenessScore || 0;
      resumeCount++;
    });

    const averageAttractiveness =
      resumeCount > 0 ? Math.round(totalAttractiveness / resumeCount) : 0;

    // Count industries from resumes
    resumesSnapshot.forEach((doc) => {
      const data = doc.data();
      const industry = data.industry || data.targetIndustry || "Other";
      industriesCounts[industry] = (industriesCounts[industry] || 0) + 1;
    });

    // Sort industries by count and get top 10
    const topIndustries = Object.entries(industriesCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent activity (last 10 events)
    const recentActivity: Array<{
      type: string;
      timestamp: Date;
      description: string;
    }> = [];

    // Recent resumes
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

    // Recent contact requests
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

    // Sort all activity by timestamp
    recentActivity.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    const analytics: SystemAnalytics = {
      totalUsers: usersSnapshot.size,
      totalResumes: resumesSnapshot.size,
      activeRecruiters,
      totalViews,
      totalContactRequests: contactRequestsSnapshot.size,
      averageAttractiveness,
      topIndustries,
      recentActivity: recentActivity.slice(0, 10),
      subscriptionDistribution,
    };

    logger.info(
      { userId, role: userRole, totalUsers: analytics.totalUsers },
      "System analytics fetched"
    );

    return NextResponse.json(analytics);
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to fetch system analytics");
    return handleApiError(error, "Failed to fetch system analytics");
  }
}
