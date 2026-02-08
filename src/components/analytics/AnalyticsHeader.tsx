"use client";

import { useRouter } from "next/navigation";

interface AnalyticsHeaderProps {
    resumeTitle: string;
    tier: string | undefined;
    loading: boolean;
    onRefresh: () => void;
}

export function AnalyticsHeader({
    resumeTitle,
    tier,
    loading,
    onRefresh,
}: AnalyticsHeaderProps) {
    const router = useRouter();

    return (
        <div className="mb-10">
            <button
                onClick={() => router.push("/dashboard")}
                className="group mb-6 flex items-center gap-2 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
            >
                <span className="transition-transform group-hover:-translate-x-1">
                    ←
                </span>
                Back to Dashboard
            </button>

            <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600">
                    Resume Analysis
                </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-[#1A2F25] tracking-tight">
                        {resumeTitle}
                    </h1>
                    <p className="mt-2 text-[#1A2F25]/60 max-w-2xl">
                        Detailed performance metrics and engagement signals for this
                        profile.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        disabled={tier === "basic"}
                        title={
                            tier === "basic"
                                ? "Available for Premium/Enterprise users"
                                : "Download Report"
                        }
                        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-[#1A2F25] shadow-sm transition-all active:scale-95 ${tier === "basic"
                                ? "opacity-40 cursor-not-allowed group relative"
                                : "hover:bg-slate-50"
                            }`}
                    >
                        <span>📥</span> Download Report
                        {tier === "basic" && (
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 rounded bg-gray-900 px-3 py-1.5 text-[10px] text-white group-hover:scale-100 transition-all shadow-xl whitespace-nowrap z-50">
                                Premium/Enterprise Only
                            </span>
                        )}
                    </button>
                    <button
                        onClick={onRefresh}
                        disabled={loading || tier === "basic"}
                        title={
                            tier === "basic"
                                ? "Available for Premium/Enterprise users"
                                : "Refresh Data"
                        }
                        className={`flex items-center gap-2 rounded-xl bg-[#1A2F25] px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${tier === "basic"
                                ? "opacity-40 cursor-not-allowed group relative"
                                : "hover:bg-black"
                            }`}
                    >
                        <span>🔄</span> {loading ? "Refreshing..." : "Refresh Data"}
                        {tier === "basic" && (
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 scale-0 rounded bg-gray-900 px-3 py-1.5 text-[10px] text-white group-hover:scale-100 transition-all shadow-xl whitespace-nowrap z-50">
                                Premium/Enterprise Only
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
