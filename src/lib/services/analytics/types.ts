export interface ViewEvent {
    id: string;
    resumeId: string;
    viewerId?: string;
    viewedAt: Date;
    duration: number;
    sourceType: string;
    metadata: Record<string, unknown>;
}

export interface SectionHeatmap {
    resumeId: string;
    sectionName: string;
    viewCount: number;
    avgTimeSpent: number;
    clickCount: number;
    engagementScore: number;
}

export interface RecruiterEngagement {
    resumeId: string;
    recruiterId: string;
    viewCount: number;
    interactionCount: number;
    lastInteractedAt: Date;
    engagementLevel: string;
    score: number;
}

export interface IndustryBenchmark {
    industry: string;
    avgAttractivenessScore: number;
    avgViewCount: number;
    avgDownloadCount: number;
    topSkills: string[];
    benchmarkDate: Date;
}

export interface TrackingRequest {
    resumeId: string;
    userId?: string;
    eventType: "view" | "request" | "approval" | "click" | "share" | "download";
    metadata?: {
        viewedBy?: string;
        viewerName?: string;
        source?: "search" | "direct" | "link" | "recruiter" | "other";
        referrer?: string;
        sessionDuration?: number;
        downloadFormat?: "pdf" | "docx" | "json";
    };
}
