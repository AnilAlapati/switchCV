"use client";

import type { Analytics } from "@/types";

interface InboundInterestsCardProps {
    demographics: Analytics["demographics"];
}

export function InboundInterestsCard({
    demographics,
}: InboundInterestsCardProps) {
    if (!demographics) return null;

    return (
        <div className="lg:col-span-1 space-y-8 h-full">
            <div className="glass-panel rounded-2xl p-6 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm h-full">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A2F25]/60 mb-6 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    Top Inbound Interests
                </h3>

                <div className="space-y-6">
                    <div>
                        <p className="text-[10px] font-black text-[#1A2F25]/30 uppercase tracking-widest mb-3">
                            Industries
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {demographics.topIndustries.map((industry) => (
                                <span
                                    key={industry}
                                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100/50"
                                >
                                    {industry}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-black text-[#1A2F25]/30 uppercase tracking-widest mb-3">
                            Markets
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {demographics.topLocations.map((location) => (
                                <span
                                    key={location}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100/50"
                                >
                                    {location}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
