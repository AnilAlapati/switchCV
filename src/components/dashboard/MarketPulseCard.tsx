"use client";

import { useGlobalStats } from "@/hooks/useGlobalStats";
import { TrendingUp, Users, Briefcase, Zap } from "lucide-react";

export function MarketPulseCard() {
    const { stats } = useGlobalStats();

    const trendingSkills = [
        { name: "React Query", trend: "+12%" },
        { name: "Next.js 14", trend: "+8%" },
        { name: "Tailwind CSS", trend: "+15%" },
        { name: "TypeScript", trend: "+5%" },
    ];

    return (
        <div className="glass-panel overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-xl">
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                        <Zap className="h-5 w-5 text-yellow-300" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">Market Pulse</h3>
                </div>

                <div className="space-y-6">
                    <div>
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">Platform Growth</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 transition-all hover:bg-white/20">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="h-3 w-3 text-indigo-200" />
                                    <span className="text-2xl font-black">{stats.jobSeekers}</span>
                                </div>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Candidates</p>
                            </div>
                            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 transition-all hover:bg-white/20">
                                <div className="flex items-center gap-2 mb-1">
                                    <Briefcase className="h-3 w-3 text-emerald-200" />
                                    <span className="text-2xl font-black">{stats.recruiters}</span>
                                </div>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Recruiters</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-white/60 uppercase tracking-widest text-[10px]">Trending Skills</p>
                            <TrendingUp className="h-3 w-3 text-indigo-300" />
                        </div>
                        <div className="space-y-2">
                            {trendingSkills.map((skill, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-default">
                                    <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{skill.name}</span>
                                    <span className="text-xs font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">{skill.trend}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-xs text-indigo-100 font-medium">
                        Based on {stats.resumes} resumes active on the platform.
                    </p>
                </div>
            </div>

            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 bg-indigo-400/20 blur-[100px] rounded-full"></div>
        </div>
    );
}
