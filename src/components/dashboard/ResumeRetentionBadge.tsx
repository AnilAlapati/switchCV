"use client";

import { Clock, AlertCircle, Info } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
    calculateRetentionStatus,
    getRetentionBadgeColor,
    getRetentionTooltipMessage,
    type RetentionStatus,
} from "@/lib/utils/resumeRetention";

interface ResumeRetentionBadgeProps {
    deletionScheduledAt?: string | null;
    expiresAt?: string | null;
    variant?: "inline" | "card" | "banner";
    showUpgradeLink?: boolean;
}

export function ResumeRetentionBadge({
    deletionScheduledAt,
    expiresAt,
    variant = "inline",
    showUpgradeLink = true,
}: ResumeRetentionBadgeProps) {
    const { tier } = useUserProfile();

    const status = calculateRetentionStatus(deletionScheduledAt, expiresAt, tier);

    // Don't show anything if not expiring
    if (!status.isExpiring) {
        return null;
    }

    const colors = getRetentionBadgeColor(status.urgencyLevel);
    const tooltipMessage = getRetentionTooltipMessage(status);
    const showClock = status.urgencyLevel === "critical" || status.urgencyLevel === "urgent";

    // Inline variant - compact badge next to resume title
    if (variant === "inline") {
        return (
            <div className="group relative inline-flex">
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-help ${colors.bg} ${colors.text} ${colors.border}`}
                >
                    {showClock && <Clock className="h-3 w-3 mr-1" />}
                    <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${colors.dot}`}></span>
                    {status.formattedTimeRemaining}
                </span>

                {/* Tooltip */}
                <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-64 rounded-xl border border-white/60 bg-white/90 backdrop-blur-xl p-3 text-xs text-[black]/80 shadow-xl z-30">
                    <p className="font-bold text-[black] mb-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Resume Expiring Soon
                    </p>
                    <p className="text-black/60 leading-relaxed mb-2">{tooltipMessage}</p>
                    {showUpgradeLink && (
                        <a
                            href="/profile/subscription"
                            className="text-indigo-600 hover:underline font-semibold text-xs"
                        >
                            Upgrade to Premium →
                        </a>
                    )}
                    {/* Arrow pointing up */}
                    <div className="absolute -top-1.5 left-6 h-3 w-3 -rotate-45 border-t border-l border-white/60 bg-white/90"></div>
                </div>
            </div>
        );
    }

    // Card variant - dedicated section below resume actions
    if (variant === "card") {
        return (
            <div
                className={`rounded-xl border p-4 ${colors.bg} ${colors.border} transition-all hover:shadow-md`}
            >
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg bg-white/50 ${colors.text}`}>
                        {showClock ? <Clock className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-bold text-sm ${colors.text}`}>
                                {status.urgencyLevel === "critical"
                                    ? "Deletion Imminent"
                                    : "Resume Expiring Soon"}
                            </h4>
                            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot} animate-pulse`}></span>
                        </div>
                        <p className="text-xs text-[black]/70 mb-2">{tooltipMessage}</p>
                        {showUpgradeLink && (
                            <a
                                href="/profile/subscription"
                                className={`inline-flex items-center text-xs font-bold ${colors.text} hover:underline`}
                            >
                                Upgrade to Keep Forever →
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Banner variant - prominent top banner (only for urgent cases)
    if (variant === "banner" && status.urgencyLevel !== "safe") {
        return (
            <div
                className={`rounded-2xl border-2 p-4 ${colors.bg} ${colors.border} shadow-lg mb-4`}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-white/70 ${colors.text}`}>
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className={`font-bold text-base ${colors.text} mb-0.5`}>
                                {status.formattedTimeRemaining?.toUpperCase()}
                            </h3>
                            <p className="text-sm text-[black]/70">{tooltipMessage}</p>
                        </div>
                    </div>
                    {showUpgradeLink && (
                        <a
                            href="/profile/subscription"
                            className="flex-shrink-0 px-5 py-2.5 bg-[black] text-white text-sm font-bold rounded-xl hover:bg-[black]/90 transition-all hover:scale-105 border-2 border-[black]"
                        >
                            Upgrade Now
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return null;
}
