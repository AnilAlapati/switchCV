"use client";

import { useMemo } from "react";
import { formatLastActivity } from "@/lib/dashboard/recruiterInsights";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import type { RecruiterMetrics } from "@/types/dashboard";
import { Users, Search, TrendingUp, Info } from "lucide-react";

interface WelcomeBannerProps {
    metrics: RecruiterMetrics | null;
    loading: boolean;
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export function WelcomeBanner({ metrics, loading }: WelcomeBannerProps) {
    const { user } = useAuth();
    const { profile } = useUserProfile();
    const greeting = useMemo(() => getGreeting(), []);
    const lastActivity = useMemo(
        () => formatLastActivity(metrics?.lastActivityAt ?? null),
        [metrics?.lastActivityAt],
    );

    const displayName = profile?.displayName || user?.displayName || "Recruiter";
    const uniqueCandidates = metrics?.searchBreakdown?.uniqueCandidatesLast7Days ?? 0;

    return (
        <section className="relative overflow-hidden bg-white border-2 border-black p-6 lg:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {/* Subtle decorative grid */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                }}
            />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Left - Greeting */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse bg-blue-600" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                            Command Center
                        </span>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-black lg:text-3xl">
                        {greeting}, <span className="text-blue-600">{displayName}</span>
                    </h2>
                    <p className="text-sm text-gray-500 font-sans max-w-md">
                        Your talent pipeline at a glance. Search, engage, and hire with autonomous intelligence.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                            <svg className="h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l3 3" />
                            </svg>
                            {lastActivity}
                        </span>
                    </div>
                </div>

                {/* Right - Market Insights (Top Skills) */}
                <div className="flex flex-col gap-3 border-l-0 lg:border-l-2 lg:border-gray-100 lg:pl-10 min-w-[280px]">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <div className="relative group flex items-center gap-1.5">
                            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">
                                Market Insights
                            </p>
                            <Info className="h-3 w-3 text-gray-400 cursor-help" />

                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-0 w-48 p-2 bg-black text-white text-[10px] rounded shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                                Distribution of skills across the entire talent pool of resumes.
                                <div className="absolute top-full left-2 border-4 border-transparent border-t-black" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {(!metrics?.searchBreakdown?.topSkillsLast7Days || metrics.searchBreakdown.topSkillsLast7Days.length === 0) ? (
                            <p className="text-xs text-gray-400 italic">No skill data available yet.</p>
                        ) : (
                            metrics.searchBreakdown.topSkillsLast7Days.slice(0, 3).map((skill, index) => {
                                // Fallback to a high number if total is 0 to avoid 100% on empty data
                                const total = metrics.searchBreakdown.uniqueCandidatesLast7Days || 100;
                                const percentage = Math.min(Math.round((skill.count / total) * 100), 100);

                                // Varied color palette
                                const colors = [
                                    "bg-blue-600",
                                    "bg-indigo-600",
                                    "bg-violet-600",
                                    "bg-emerald-600"
                                ];
                                const barColor = colors[index % colors.length];
                                const textColor = barColor.replace('bg-', 'text-');

                                return (
                                    <div key={skill.name} className="space-y-1">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-black">{skill.name}</span>
                                            <span className={textColor}>{percentage}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${barColor} rounded-full`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
