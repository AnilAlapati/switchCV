// Analytics API Endpoint - Dashboard and metrics

import { NextRequest, NextResponse } from "next/server";
import type {
  ResumeAnalytics,
  ViewEvent,
  SectionHeatmap,
  RecruiterEngagement,
  IndustryBenchmark,
} from "@/lib/analytics.types";
import { AnalyticsService } from "@/lib/analytics.service";

/**
 * Request body interface
 */
interface DashboardRequest {
  resumeId: string;
  userId: string;
}

/**
 * Mock database for demonstration
 */
const mockAnalyticsDb = new Map<string, ResumeAnalytics>();
const mockViewEventsDb = new Map<string, ViewEvent[]>();
const mockHeatmapsDb = new Map<string, SectionHeatmap[]>();
const mockRecruitersDb = new Map<string, RecruiterEngagement[]>();

/**
 * Initialize mock data
 */
function initializeMockData(resumeId: string, userId: string): void {
  if (!mockAnalyticsDb.has(resumeId)) {
    mockAnalyticsDb.set(resumeId, {
      resumeId,
      userId,
      viewCount: Math.floor(Math.random() * 150) + 10,
      uniqueViewCount: Math.floor(Math.random() * 80) + 5,
      downloadCount: Math.floor(Math.random() * 30) + 2,
      shareCount: Math.floor(Math.random() * 15),
      attractivenessScore: Math.floor(Math.random() * 35) + 50,
      lastViewedAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ),
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    // Generate view events
    const viewEvents: ViewEvent[] = [];
    const sectionNames = [
      "summary",
      "experience",
      "skills",
      "education",
      "projects",
    ];

    for (let i = 0; i < 50; i++) {
      viewEvents.push({
        id: `view-${i}`,
        resumeId,
        viewerId: `recruiter-${Math.floor(Math.random() * 20)}`,
        viewedAt: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ),
        duration: Math.floor(Math.random() * 300) + 30,
        sourceType: ["direct", "search", "shared", "recommendation"][
          Math.floor(Math.random() * 4)
        ] as any,
        metadata: {
          section:
            sectionNames[Math.floor(Math.random() * sectionNames.length)],
          clicks: Math.floor(Math.random() * 5),
        },
      });
    }

    mockViewEventsDb.set(resumeId, viewEvents);

    // Generate heatmaps
    const heatmaps = AnalyticsService.generateHeatmap(
      viewEvents,
      resumeId,
      sectionNames
    );
    mockHeatmapsDb.set(resumeId, heatmaps);

    // Generate recruiter engagement
    const recruiters: RecruiterEngagement[] = [];
    for (let i = 0; i < 15; i++) {
      const interactions = Math.floor(Math.random() * 10) + 1;
      recruiters.push({
        resumeId,
        recruiterId: `recruiter-${i}`,
        viewCount: Math.floor(Math.random() * 10) + 1,
        interactionCount: interactions,
        lastInteractedAt: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        ),
        engagementLevel: ["low", "medium", "high", "very-high"][
          Math.floor(Math.random() * 4)
        ] as any,
        score: Math.floor(Math.random() * 40) + 40,
      });
    }

    mockRecruitersDb.set(resumeId, recruiters);
  }
}

/**
 * POST /api/analytics/dashboard - Get analytics dashboard
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as DashboardRequest;
    const { resumeId, userId } = body;

    if (!resumeId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 }
      );
    }

    // Initialize mock data if needed
    initializeMockData(resumeId, userId);

    // Retrieve data
    const analytics = mockAnalyticsDb.get(resumeId);
    const heatmaps = mockHeatmapsDb.get(resumeId) || [];
    const recruiters = mockRecruitersDb.get(resumeId) || [];

    if (!analytics) {
      return NextResponse.json(
        { success: false, message: "Analytics not found" },
        { status: 404 }
      );
    }

    // Create benchmark (mock)
    const benchmark: IndustryBenchmark = {
      industry: "Technology",
      avgAttractivenessScore: 62,
      avgViewCount: 45,
      avgDownloadCount: 12,
      topSkills: ["TypeScript", "React", "Node.js", "AWS", "MongoDB"],
      benchmarkDate: new Date(),
    };

    // Aggregate to dashboard
    const dashboard = AnalyticsService.aggregateToDashboard(
      analytics,
      heatmaps,
      recruiters,
      benchmark
    );

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * GET /api/analytics/dashboard - Get analytics summary
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");
    const userId = request.nextUrl.searchParams.get("userId");

    if (!resumeId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 }
      );
    }

    initializeMockData(resumeId, userId);

    const analytics = mockAnalyticsDb.get(resumeId);

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
