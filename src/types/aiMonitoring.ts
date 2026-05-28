export interface AIFailureEventDoc {
    id: string;
    requestId: string;
    stage: "extraction" | "generation" | "repair" | string;
    provider?: string;
    model?: string;
    failureCode: string;
    errorMessage: string;
    httpStatus?: number;
    latencyMs?: number;
    fallbackUsed?: boolean;
    fallbackSucceeded?: boolean;
    userTier?: string;
    environment?: string;
    deployVersion?: string;
    createdAt?: string;
    conversationTurn?: number;
}

export interface AIRequestStageSummary {
    status?: "success" | "degraded" | "failed";
    attempts?: number;
    failureCount?: number;
    fallbackUsed?: boolean;
    fallbackSucceeded?: boolean;
    failureCodes?: string[];
    providers?: string[];
    models?: string[];
    latencyMs?: number;
}

export interface AIRequestSummaryDoc {
    id: string;
    requestId: string;
    entrypoint: string;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    status: "success" | "degraded" | "failed";
    userVisibleFailure: boolean;
    failureCount: number;
    fallbackCount: number;
    stages?: Partial<
        Record<"extraction" | "generation" | "repair", AIRequestStageSummary>
    >;
    finalOutcome?: string;
    createdResume?: boolean;
    environment?: string;
    deployVersion?: string;
}

export interface AIDailyMetricsDoc {
    id: string;
    totalRequests: number;
    successfulRequests: number;
    degradedRequests: number;
    failedRequests: number;
    userVisibleFailures: number;
    fallbackRecoveredRequests: number;
    extractionFailures: number;
    generationFailures: number;
    repairFailures: number;
    failureCountsByCode: Record<string, number>;
    failureCountsByProvider: Record<string, number>;
    failureCountsByModel: Record<string, number>;
    avgLatencyByStage: Record<string, number>;
    updatedAt: string;
}

export interface AIIncident {
    key: string;
    severity: "critical" | "warning";
    title: string;
    summary: string;
    requestIds: string[];
    details: Record<string, number | string>;
}

export interface PersistedAIIncident extends AIIncident {
    startedAt: string;
    lastSeenAt: string;
    lastSentAt?: string;
    recoveryCandidateAt?: string | null;
}

export interface AIProviderHealthSnapshot {
    provider: string;
    status: "healthy" | "degraded" | "disabled";
    disabledUntil: string | null;
    errorRate: number;
    schemaErrorRate: number;
    averageLatencyMs: number;
    sampleCount: number;
    lastUpdatedAt: string | null;
}

export interface AdminAiMonitoringQuery {
    requestId?: string | null;
    limit?: string | null;
    days?: string | null;
    stage?: string | null;
    failureCode?: string | null;
    provider?: string | null;
    model?: string | null;
}

export interface AdminAiMonitoringResponse {
    overview?: {
        days: number;
        latestDailyMetrics: AIDailyMetricsDoc | null;
        openIncidentCount: number;
        providerHealth?: AIProviderHealthSnapshot[];
    };
    failureEvents?: AIFailureEventDoc[];
    requestSummaries?: AIRequestSummaryDoc[];
    dailyMetrics: AIDailyMetricsDoc[];
    openIncidents: Record<string, PersistedAIIncident>;
    requestTrace?: {
        summary: AIRequestSummaryDoc | null;
        events: AIFailureEventDoc[];
    };
}
