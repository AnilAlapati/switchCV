"use client";

/**
 * AnalyticsSkeleton - Loading skeleton for analytics page
 * Provides visual feedback while analytics data is loading
 */

export function MetricCardSkeleton() {
    return (
        <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm animate-pulse">
            <div className="flex items-center justify-between mb-4">
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
            </div>
            <div className="flex items-baseline gap-3">
                <div className="h-9 w-20 bg-slate-300 rounded"></div>
                <div className="h-5 w-12 bg-slate-200 rounded-lg"></div>
            </div>
        </div>
    );
}

export function TierBarSkeleton() {
    return (
        <div className="space-y-1.5 animate-pulse">
            <div className="flex justify-between">
                <div className="h-3 w-16 bg-slate-200 rounded"></div>
                <div className="h-3 w-20 bg-slate-200 rounded"></div>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full">
                <div className="h-full w-1/2 bg-slate-300 rounded-full"></div>
            </div>
        </div>
    );
}

export function IndustryItemSkeleton() {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100/50 animate-pulse">
            <div className="flex items-center gap-2">
                <div className="h-3 w-5 bg-slate-200 rounded"></div>
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
            </div>
            <div className="h-5 w-8 bg-slate-200 rounded-md"></div>
        </div>
    );
}

export function ActivityItemSkeleton() {
    return (
        <div className="relative pl-6 pb-4 border-l border-slate-200 animate-pulse">
            <div className="absolute top-0 left-[-4.5px] h-2 w-2 rounded-full bg-slate-300"></div>
            <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
            <div className="h-3 w-24 bg-slate-200 rounded"></div>
        </div>
    );
}

export function AnalyticsPageSkeleton() {
    return (
        <div className="space-y-8">
            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
            </div>

            {/* Secondary Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Secondary Metrics */}
                <div className="lg:col-span-1 space-y-6">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />

                    {/* Subscription Tiers */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-3 w-32 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-8 w-8 bg-slate-200 rounded-lg animate-pulse"></div>
                        </div>
                        <div className="space-y-4">
                            <TierBarSkeleton />
                            <TierBarSkeleton />
                            <TierBarSkeleton />
                        </div>
                    </div>
                </div>

                {/* Right Column - Data Visualizations */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Top Industries */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-3 w-32 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <IndustryItemSkeleton />
                            <IndustryItemSkeleton />
                            <IndustryItemSkeleton />
                            <IndustryItemSkeleton />
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="h-3 w-40 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="space-y-4">
                            <ActivityItemSkeleton />
                            <ActivityItemSkeleton />
                            <ActivityItemSkeleton />
                            <ActivityItemSkeleton />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
