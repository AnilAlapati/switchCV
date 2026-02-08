"use client";

import type { Analytics } from "@/types";

interface ResumeScoreCardProps {
    analytics: Analytics;
}

export function ResumeScoreCard({ analytics }: ResumeScoreCardProps) {
    const score = Math.min(
        100,
        Math.round(
            (analytics.views.count * 0.5 +
                (analytics.requests?.totalRequests || 0) * 10 +
                (analytics.engagement?.avgSessionDuration || 0) * 0.1) /
            2
        ) || 0
    );

    return (
        <div className="lg:col-span-1 glass-panel rounded-2xl p-8 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-[#1A2F25]">Resume Score</h2>
                    <span className="text-xl">⭐</span>
                </div>
                <p className="text-[#1A2F25]/60 text-sm mb-8">
                    AI-calculated score based on views, depth of engagement, and recruiter
                    intent.
                </p>
            </div>

            <div className="text-center py-6">
                <div className="relative inline-flex items-center justify-center">
                    <svg className="h-32 w-32 transform -rotate-90">
                        <circle
                            className="text-slate-100"
                            strokeWidth="8"
                            stroke="currentColor"
                            fill="transparent"
                            r="58"
                            cx="64"
                            cy="64"
                        />
                        <circle
                            className="text-indigo-500 transition-all duration-1000 ease-out"
                            strokeWidth="8"
                            strokeDasharray={364}
                            strokeDashoffset={364 - (364 * score) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="58"
                            cx="64"
                            cy="64"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-4xl font-black text-[#1A2F25]">{score}</span>
                        <span className="text-[10px] font-bold text-[#1A2F25]/40 uppercase tracking-widest">
                            Score
                        </span>
                    </div>
                </div>
                <p className="text-emerald-600 text-xs font-bold mt-4 flex items-center justify-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Data Pulse
                </p>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-[10px] text-center text-[#1A2F25]/40 font-bold uppercase tracking-widest leading-relaxed">
                    Powered by Live Analytics Engine
                </p>
            </div>
        </div>
    );
}
