// Analytics API Endpoint - Dashboard and metrics
// FIXED: Now uses real Firestore data instead of mock random data

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import type {
  ResumeAnalytics,
  ViewEvent,
  SectionHeatmap,
  RecruiterEngagement,
  IndustryBenchmark,
} from "@/lib/analytics.types";
import { AnalyticsService } from "@/lib/analytics.service";
import { logger } from "@/lib/logger";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

/**
 * Request body interface
 */
interface DashboardRequest {
  resumeId: string;
  userId?: string; // Optional now, will use auth userId if missing
}

/**
 * Get real analytics data from Firestore
 */
async function getAnalyticsFromFirestore(
  resumeId: string,
  userId: string
): Promise<ResumeAnalytics> {
  const analyticsRef = adminDb.collection("analytics").doc(resumeId);
  const doc = await analyticsRef.get();

  if (!doc.exists) {
    // Create initial analytics record
    const initialAnalytics: ResumeAnalytics = {
      resumeId,
      userId,
      viewCount: 0,
      uniqueViewCount: 0,
      downloadCount: 0,
      shareCount: 0,
      attractivenessScore: 0,
      lastViewedAt: null as unknown as Date,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await analyticsRef.set({
      ...initialAnalytics,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return initialAnalytics;
  }

  const data = doc.data()!;
  return {
    resumeId,
    userId: data.userId,
    viewCount: data.viewCount || 0,
    uniqueViewCount: data.uniqueViewCount || 0,
    downloadCount: data.downloadCount || 0,
    shareCount: data.shareCount || 0,
    attractivenessScore: data.attractivenessScore || 0,
    lastViewedAt: data.lastViewedAt?.toDate() || null,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as ResumeAnalytics;
}

/**
 * Get view events from Firestore
 */
async function getViewEvents(resumeId: string): Promise<ViewEvent[]> {
  const eventsSnap = await adminDb
    .collection("analytics")
    .doc(resumeId)
    .collection("viewEvents")
    .orderBy("viewedAt", "desc")
    .limit(100)
    .get();

  return eventsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      resumeId,
      viewerId: data.viewerId,
      viewedAt: data.viewedAt?.toDate() || new Date(),
      duration: data.duration || 0,
      sourceType: data.sourceType || "direct",
      metadata: data.metadata || {},
    } as ViewEvent;
  });
}

/**
 * Get heatmap data from Firestore
 */
async function getHeatmaps(resumeId: string): Promise<SectionHeatmap[]> {
  const heatmapSnap = await adminDb
    .collection("analytics")
    .doc(resumeId)
    .collection("heatmaps")
    .get();

  return heatmapSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      resumeId,
      sectionName: data.sectionName || doc.id,
      viewCount: data.viewCount || 0,
      avgTimeSpent: data.avgTimeSpent || data.avgDuration || 0,
      clickCount: data.clickCount || 0,
      engagementScore: data.engagementScore || data.heatScore || 0,
    } as SectionHeatmap;
  });
}

/**
 * Get recruiter engagement from Firestore
 */
async function getRecruiterEngagement(
  resumeId: string
): Promise<RecruiterEngagement[]> {
  const recruitersSnap = await adminDb
    .collection("analytics")
    .doc(resumeId)
    .collection("recruiterEngagement")
    .orderBy("lastInteractedAt", "desc")
    .limit(50)
    .get();

  return recruitersSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      resumeId,
      recruiterId: data.recruiterId,
      viewCount: data.viewCount || 0,
      interactionCount: data.interactionCount || 0,
      lastInteractedAt: data.lastInteractedAt?.toDate() || new Date(),
      engagementLevel: data.engagementLevel || "low",
      score: data.score || 0,
    } as RecruiterEngagement;
  });
}

/**
 * Get or compute industry benchmark
 */
async function getIndustryBenchmark(
  industry: string
): Promise<IndustryBenchmark> {
  const benchmarkRef = adminDb
    .collection("benchmarks")
    .doc(industry.toLowerCase());
  const doc = await benchmarkRef.get();

  if (doc.exists) {
    const data = doc.data()!;
    return {
      industry: data.industry,
      avgAttractivenessScore: data.avgAttractivenessScore || 50,
      avgViewCount: data.avgViewCount || 30,
      avgDownloadCount: data.avgDownloadCount || 5,
      topSkills: data.topSkills || [],
      benchmarkDate: data.benchmarkDate?.toDate() || new Date(),
    };
  }

  // Return default benchmark if not found
  return {
    industry: industry || "General",
    avgAttractivenessScore: 50,
    avgViewCount: 30,
    avgDownloadCount: 5,
    topSkills: [],
    benchmarkDate: new Date(),
  };
}

/**
 * POST /api/analytics/dashboard - Get analytics dashboard
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const body = (await request.json()) as DashboardRequest;
    const { resumeId } = body;
    const userId = body.userId || authUserId;

    if (!resumeId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 }
      );
    }

    // Security check: Ensure user owns the resume or is admin
    if (userId !== authUserId) {
      const userDoc = await adminDb.collection("users").doc(authUserId!).get();
      if (userDoc.data()?.role !== "admin") {
        return handleApiError(null, "Forbidden: Access denied", 403);
      }
    }

    // Get real data from Firestore
    const [analytics, viewEvents, heatmaps, recruiters] = await Promise.all([
      getAnalyticsFromFirestore(resumeId, userId),
      getViewEvents(resumeId),
      getHeatmaps(resumeId),
      getRecruiterEngagement(resumeId),
    ]);

    // Get benchmark data
    const benchmark = await getIndustryBenchmark("Technology");

    // If no heatmaps exist, generate from view events
    const finalHeatmaps =
      heatmaps.length > 0
        ? heatmaps
        : AnalyticsService.generateHeatmap(viewEvents, resumeId, [
          "summary",
          "experience",
          "skills",
          "education",
          "projects",
        ]);

    // Aggregate to dashboard
    const dashboard = AnalyticsService.aggregateToDashboard(
      analytics,
      finalHeatmaps,
      recruiters,
      benchmark
    );

    logger.info({ resumeId, userId }, "Analytics dashboard retrieved");

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error }, "Analytics dashboard error");
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * GET /api/analytics/dashboard - Get analytics summary
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const resumeId = request.nextUrl.searchParams.get("resumeId");
    const userId = request.nextUrl.searchParams.get("userId") || authUserId;

    if (!resumeId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 }
      );
    }

    // Security check
    if (userId !== authUserId) {
      const userDoc = await adminDb.collection("users").doc(authUserId!).get();
      if (userDoc.data()?.role !== "admin") {
        return handleApiError(null, "Forbidden: Access denied", 403);
      }
    }

    const analytics = await getAnalyticsFromFirestore(resumeId, userId);

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error }, "Analytics GET error");
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
