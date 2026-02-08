import { adminDb } from "@/lib/firebase-admin";
import { Analytics } from "@/types";
import { ViewEvent, SectionHeatmap, RecruiterEngagement, IndustryBenchmark } from "./types";

/**
 * Get comprehensive dashboard analytics
 */
export async function getDashboardAnalytics(resumeId: string) {
    // 1. Get base analytics
    const analyticsRef = adminDb.collection("analytics").doc(resumeId);
    const doc = await analyticsRef.get();

    let analyticsData;
    if (!doc.exists) {
        // Initialize if missing
        analyticsData = {
            resumeId,
            viewCount: 0,
            uniqueViewCount: 0,
            downloadCount: 0,
            shareCount: 0,
            attractivenessScore: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await analyticsRef.set(analyticsData);
    } else {
        const d = doc.data()!;
        analyticsData = {
            ...d,
            lastViewedAt: d.lastViewedAt?.toDate(),
            createdAt: d.createdAt?.toDate(),
            updatedAt: d.updatedAt?.toDate(),
        };
    }

    // 2. Fetch sub-collections
    const [viewEventsSnap, heatmapsSnap, recruitersSnap] = await Promise.all([
        adminDb
            .collection("analytics")
            .doc(resumeId)
            .collection("viewEvents")
            .orderBy("viewedAt", "desc")
            .limit(100)
            .get(),
        adminDb.collection("analytics").doc(resumeId).collection("heatmaps").get(),
        adminDb
            .collection("analytics")
            .doc(resumeId)
            .collection("recruiterEngagement")
            .orderBy("lastInteractedAt", "desc")
            .limit(50)
            .get(),
    ]);

    const viewEvents: ViewEvent[] = viewEventsSnap.docs.map((doc) => {
        const d = doc.data();
        return {
            id: doc.id,
            resumeId,
            viewerId: d.viewerId,
            viewedAt: d.viewedAt?.toDate(),
            duration: d.duration || 0,
            sourceType: d.sourceType,
            metadata: d.metadata || {},
        } as ViewEvent;
    });

    const heatmaps: SectionHeatmap[] = heatmapsSnap.docs.map(
        (doc) =>
        ({
            ...doc.data(),
            sectionName: doc.data().sectionName || doc.id,
        } as SectionHeatmap)
    );

    const recruiters: RecruiterEngagement[] = recruitersSnap.docs.map((doc) => {
        const d = doc.data();
        return {
            ...d,
            lastInteractedAt: d.lastInteractedAt?.toDate(),
        } as RecruiterEngagement;
    });

    // 3. Generate missing heatmaps if needed
    const finalHeatmaps =
        heatmaps.length > 0
            ? heatmaps
            : generateHeatmap(viewEvents, resumeId, [
                "summary",
                "experience",
                "skills",
                "education",
                "projects",
            ]);

    // 4. Get Benchmark (defaulting to Technology for now, could be dynamic)
    const benchmarkRef = adminDb.collection("benchmarks").doc("technology");
    const benchDoc = await benchmarkRef.get();
    let benchmark: IndustryBenchmark = {
        industry: "Technology",
        avgAttractivenessScore: 50,
        avgViewCount: 30,
        avgDownloadCount: 5,
        topSkills: [],
        benchmarkDate: new Date(),
    };

    if (benchDoc.exists) {
        const d = benchDoc.data()!;
        benchmark = {
            ...d,
            benchmarkDate: d.benchmarkDate?.toDate(),
        } as IndustryBenchmark;
    }

    return aggregateToDashboard(
        analyticsData as unknown as Partial<Analytics>,
        finalHeatmaps,
        recruiters,
        benchmark
    );
}

export function generateHeatmap(
    events: ViewEvent[],
    resumeId: string,
    sections: string[]
): SectionHeatmap[] {
    // stub implementation - simplistic logic
    return sections.map((section) => ({
        resumeId,
        sectionName: section,
        viewCount: Math.floor(Math.random() * 10), // Placeholder logic would go here
        avgTimeSpent: 10,
        clickCount: 0,
        engagementScore: 50,
    }));
}

export function aggregateToDashboard(
    analytics: Partial<Analytics> & { viewCount?: number },
    heatmaps: SectionHeatmap[],
    recruiters: RecruiterEngagement[],
    benchmark: IndustryBenchmark
) {
    return {
        summary: {
            totalViews: analytics.viewCount || analytics.views?.count || 0,
            uniqueViews:
                analytics.uniqueViews ||
                analytics.uniqueViewCount ||
                analytics.views?.uniqueViewers ||
                analytics.viewCount ||
                0,
            conversionRate: 0,
            avgTimeOnResume: 45, // seconds
        },
        trends: [], // would map from viewEvents
        heatmaps,
        recruiterActivity: recruiters,
        benchmark,
    };
}
