"use client";

import { DashboardBackground } from "@/components/dashboard/DashboardBackground";

export function ProfileSettingsSkeleton() {
    return (
        <DashboardBackground>
            {/* Header Skeleton */}
            <div className="absolute top-0 right-0 p-4 w-full flex justify-end">
                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse"></div>
            </div>

            <main className="relative z-10 max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center space-y-4">
                    <div className="h-12 w-64 bg-slate-200/50 rounded mx-auto animate-pulse"></div>
                    <div className="h-4 w-96 bg-slate-200/30 rounded mx-auto animate-pulse"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column Skeleton */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="glass-panel p-6 border border-white/60 bg-white/40 h-96 animate-pulse">
                            <div className="h-6 w-32 bg-slate-200 rounded mb-8"></div>
                            <div className="space-y-6">
                                <div className="h-10 w-full bg-slate-200 rounded"></div>
                                <div className="h-10 w-full bg-slate-200 rounded"></div>
                                <div className="h-10 w-3/4 bg-slate-200 rounded"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column Skeleton */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="glass-panel p-6 border border-white/60 bg-white/40 h-96 animate-pulse">
                            <div className="h-6 w-32 bg-slate-200 rounded mb-8"></div>
                            <div className="space-y-4">
                                <div className="h-8 w-full bg-slate-200 rounded"></div>
                                <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                                <div className="h-32 w-full bg-slate-200 rounded mt-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </DashboardBackground>
    );
}
