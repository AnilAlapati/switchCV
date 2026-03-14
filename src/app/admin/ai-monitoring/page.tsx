"use client";

import { useState } from "react";
import { useAiMonitoring } from "@/hooks/useAiMonitoring";
import { OverviewSection } from "./components/OverviewSection";
import { FailureTable } from "./components/FailureTable";
import { TraceView } from "./components/TraceView";
import { AdminDashboardSkeleton } from "@/components/admin/AdminDashboardSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Tab = "overview" | "failures" | "trace";

export default function AiMonitoringDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { role, loading: profileLoading } = useUserProfile();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>("overview");

    // Overview needs data from last 7 days without filters
    const {
        data: overviewData,
        loading: overviewLoading,
        error: overviewError
    } = useAiMonitoring();

    // Failure table needs recent single events
    const {
        data: failuresData,
        loading: failuresLoading,
        error: failuresError
    } = useAiMonitoring({ limit: "50", days: "7" });

    const loading = authLoading || profileLoading;

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/auth?mode=signin");
            } else if (role !== "admin") {
                router.push("/dashboard");
            }
        }
    }, [user, role, loading, router]);

    if (loading || (overviewLoading && !overviewData)) {
        return <AdminDashboardSkeleton />;
    }

    if (!user || role !== "admin") return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                <div className="flex items-center gap-4 mb-2">
                    <Link
                        href="/admin"
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Admin
                    </Link>
                </div>

                <div className="flex justify-between items-end border-b border-slate-200 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">AI Monitoring</h1>
                        <p className="text-slate-500 mt-2">
                            Track failures, provider health, and fallback behavior.
                        </p>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab("overview")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "overview"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab("failures")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "failures"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                                }`}
                        >
                            Failure Events
                        </button>
                        <button
                            onClick={() => setActiveTab("trace")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === "trace"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                                }`}
                        >
                            Request Trace
                        </button>
                    </div>
                </div>

                {overviewError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                        {overviewError}
                    </div>
                )}

                <div className="mt-8">
                    {activeTab === "overview" && (
                        <OverviewSection
                            overview={overviewData?.overview}
                            openIncidents={overviewData?.openIncidents}
                        />
                    )}

                    {activeTab === "failures" && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">
                                Recent Failure Events
                            </h2>
                            {failuresError && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 mb-4">
                                    Failed to load failure events: {failuresError}
                                </div>
                            )}
                            {failuresLoading && !failuresData ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                </div>
                            ) : (
                                <FailureTable events={failuresData?.failureEvents} />
                            )}
                        </div>
                    )}

                    {activeTab === "trace" && <TraceView />}
                </div>
            </div>
        </div>
    );
}
