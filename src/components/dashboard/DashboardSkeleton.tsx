"use client";

/**
 * DashboardSkeleton - Loading skeleton for dashboard components
 * Provides visual feedback while data is loading
 */

export function MetricsCardSkeleton() {
    return (
        <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-6 backdrop-blur-sm animate-pulse">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="h-4 w-24 bg-cyan-500/20 rounded mb-2"></div>
                    <div className="h-8 w-16 bg-cyan-500/30 rounded"></div>
                </div>
                <div className="h-10 w-10 bg-cyan-500/20 rounded-full"></div>
            </div>
        </div>
    );
}

export function ResumeSnapshotSkeleton() {
    return (
        <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-6 backdrop-blur-sm animate-pulse">
            <div className="h-6 w-32 bg-cyan-500/20 rounded mb-4"></div>
            <div className="space-y-3">
                <div className="h-4 w-full bg-cyan-500/10 rounded"></div>
                <div className="h-4 w-5/6 bg-cyan-500/10 rounded"></div>
                <div className="h-4 w-4/6 bg-cyan-500/10 rounded"></div>
            </div>
            <div className="mt-6 flex gap-3">
                <div className="h-10 w-24 bg-cyan-500/20 rounded"></div>
                <div className="h-10 w-24 bg-cyan-500/20 rounded"></div>
            </div>
        </div>
    );
}

export function ActionItemsSkeleton() {
    return (
        <div className="rounded-lg border border-cyan-500/20 bg-black/40 p-6 backdrop-blur-sm animate-pulse">
            <div className="h-6 w-32 bg-cyan-500/20 rounded mb-4"></div>
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded bg-cyan-500/5">
                        <div className="h-5 w-5 bg-cyan-500/20 rounded"></div>
                        <div className="flex-1">
                            <div className="h-4 w-3/4 bg-cyan-500/10 rounded mb-2"></div>
                            <div className="h-3 w-1/2 bg-cyan-500/10 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardMetricsSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <MetricsCardSkeleton />
            <MetricsCardSkeleton />
            <MetricsCardSkeleton />
            <MetricsCardSkeleton />
        </div>
    );
}

export function JobSeekerDashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Metrics Grid */}
            <DashboardMetricsSkeleton />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ResumeSnapshotSkeleton />
                <ActionItemsSkeleton />
            </div>
        </div>
    );
}

export function RecruiterDashboardSkeleton() {
    return (
        <div className="space-y-8">
            {/* Welcome Banner Skeleton */}
            <div className="bg-white border-2 border-black p-6 lg:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3 flex-1">
                        <div className="h-3 w-24 bg-gray-200 rounded" />
                        <div className="h-8 w-64 bg-gray-200 rounded" />
                        <div className="h-4 w-80 bg-gray-100 rounded" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-24 w-24 bg-gray-100 rounded-full" />
                        <div className="space-y-2">
                            <div className="h-3 w-20 bg-gray-200 rounded" />
                            <div className="h-5 w-28 bg-gray-200 rounded" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Row Skeleton */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-gray-200" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3 w-20 bg-gray-200 rounded" />
                                <div className="h-7 w-12 bg-gray-300 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions Skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-5 animate-pulse">
                        <div className="h-12 w-12 bg-gray-100 mb-4" />
                        <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-36 bg-gray-100 rounded" />
                    </div>
                ))}
            </div>

            {/* Search Section Skeleton */}
            <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 animate-pulse">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                <div className="h-12 w-full bg-gray-100 rounded" />
            </div>
        </div>
    );
}
