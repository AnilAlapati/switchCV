"use client";

import type { ReactElement } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { FREE_TIER_AGENT_LIMIT } from "@/lib/config";
import { SparklesIcon } from "lucide-react";

interface AgentStatusProps {
    className?: string;
}

export function AgentStatus({ className = "" }: AgentStatusProps): ReactElement | null {
    const { profile, tier, loading } = useUserProfile();

    if (loading || !profile) return null;

    // Premium/Enterprise users have unlimited access
    const isPremium = tier === "premium" || tier === "enterprise";

    if (isPremium) {
        return (
            <div className={`flex items-center gap-2 text-sm text-blue-600 font-mono font-bold uppercase tracking-wider ${className}`}>
                <SparklesIcon className="w-4 h-4" />
                <span>Unlimited AI Agent Access</span>
            </div>
        );
    }

    const usageCount = profile.agentic?.usageCount || 0;
    const runsLeft = Math.max(0, FREE_TIER_AGENT_LIMIT - usageCount);
    const percentage = Math.min(100, (usageCount / FREE_TIER_AGENT_LIMIT) * 100);
    const isLimitReached = runsLeft === 0;

    return (
        <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all hover:border-black/50 ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-bold text-black border-b border-black pb-0.5">
                    <SparklesIcon className="w-4 h-4 text-black" />
                    <span className="font-serif">AI Agent Runs</span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500">
                    {runsLeft} left
                </span>
            </div>

            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4 border border-gray-200">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isLimitReached ? "bg-red-500" : "bg-black"}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <p className="text-xs text-gray-500 text-center font-sans">
                {runsLeft > 0
                    ? "Use your free runs to create the perfect resume."
                    : "Limit reached. Upgrade to continue using AI agents."}
            </p>
        </div>
    );
}
