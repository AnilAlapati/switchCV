"use client";

import { useUserProfile } from "@/hooks/useUserProfile";
import { FREE_TIER_AGENT_LIMIT } from "@/lib/config";
import { SparklesIcon } from "lucide-react";

interface AgentStatusProps {
    className?: string;
}

export function AgentStatus({ className = "" }: AgentStatusProps) {
    const { profile, tier, loading } = useUserProfile();

    if (loading || !profile) return null;

    // Premium/Enterprise users have unlimited access
    const isPremium = tier === "premium" || tier === "enterprise";

    if (isPremium) {
        return (
            <div className={`flex items-center gap-2 text-sm text-indigo-600 font-medium ${className}`}>
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
        <div className={`glass-panel p-4 rounded-xl border border-indigo-100/50 space-y-3 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#1A2F25]">
                    <SparklesIcon className="w-4 h-4 text-indigo-500" />
                    <span>AI Agent Runs</span>
                </div>
                <span className="text-xs font-medium text-[#1A2F25]/60">
                    {runsLeft} left
                </span>
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isLimitReached ? "bg-red-400" : "bg-gradient-to-r from-indigo-500 to-cyan-400"}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <p className="text-xs text-[#1A2F25]/60 text-center">
                {runsLeft > 0
                    ? "Use your free runs to create the perfect resume."
                    : "Limit reached. Upgrade to continue using AI agents."}
            </p>
        </div>
    );
}
