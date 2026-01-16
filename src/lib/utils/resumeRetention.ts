import { SubscriptionTier } from "@/lib/config.client";

export type RetentionStatus = {
    isExpiring: boolean;
    daysRemaining: number | null;
    hoursRemaining: number | null;
    urgencyLevel: "safe" | "warning" | "urgent" | "critical";
    deletionDate: Date | null;
    expirationDate: Date | null;
    formattedTimeRemaining: string | null;
};

/**
 * Calculate the retention status for a resume
 */
export function calculateRetentionStatus(
    deletionScheduledAt: string | null | undefined,
    expiresAt: string | null | undefined,
    tier: SubscriptionTier
): RetentionStatus {
    // Premium and Enterprise users have no retention limits
    if (tier === "premium" || tier === "enterprise") {
        return {
            isExpiring: false,
            daysRemaining: null,
            hoursRemaining: null,
            urgencyLevel: "safe",
            deletionDate: null,
            expirationDate: null,
            formattedTimeRemaining: null,
        };
    }

    if (!deletionScheduledAt && !expiresAt) {
        return {
            isExpiring: false,
            daysRemaining: null,
            hoursRemaining: null,
            urgencyLevel: "safe",
            deletionDate: null,
            expirationDate: null,
            formattedTimeRemaining: null,
        };
    }

    const now = new Date();
    const deletionDate = deletionScheduledAt ? new Date(deletionScheduledAt) : null;
    const expirationDate = expiresAt ? new Date(expiresAt) : null;

    // Use deletion date if available, otherwise expiration date
    const targetDate = deletionDate || expirationDate;
    if (!targetDate) {
        return {
            isExpiring: false,
            daysRemaining: null,
            hoursRemaining: null,
            urgencyLevel: "safe",
            deletionDate: null,
            expirationDate: null,
            formattedTimeRemaining: null,
        };
    }

    const msRemaining = targetDate.getTime() - now.getTime();
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const daysRemaining = Math.floor(hoursRemaining / 24);

    let urgencyLevel: "safe" | "warning" | "urgent" | "critical";
    if (hoursRemaining < 24) {
        urgencyLevel = "critical";
    } else if (daysRemaining <= 1) {
        urgencyLevel = "urgent";
    } else if (daysRemaining <= 3) {
        urgencyLevel = "warning";
    } else {
        urgencyLevel = "safe";
    }

    const formattedTimeRemaining = formatTimeRemaining(daysRemaining, hoursRemaining);

    return {
        isExpiring: msRemaining > 0,
        daysRemaining,
        hoursRemaining,
        urgencyLevel,
        deletionDate,
        expirationDate,
        formattedTimeRemaining,
    };
}

/**
 * Get color classes for retention badge based on urgency level
 */
export function getRetentionBadgeColor(urgencyLevel: RetentionStatus["urgencyLevel"]): {
    bg: string;
    text: string;
    border: string;
    dot: string;
} {
    switch (urgencyLevel) {
        case "critical":
            return {
                bg: "bg-red-500/10",
                text: "text-red-600",
                border: "border-red-500/20",
                dot: "bg-red-500",
            };
        case "urgent":
            return {
                bg: "bg-orange-500/10",
                text: "text-orange-600",
                border: "border-orange-500/20",
                dot: "bg-orange-500",
            };
        case "warning":
            return {
                bg: "bg-amber-500/10",
                text: "text-amber-600",
                border: "border-amber-500/20",
                dot: "bg-amber-500",
            };
        default:
            return {
                bg: "bg-emerald-500/10",
                text: "text-emerald-600",
                border: "border-emerald-500/20",
                dot: "bg-emerald-500",
            };
    }
}

/**
 * Format time remaining in a human-readable way
 */
export function formatTimeRemaining(daysRemaining: number, hoursRemaining: number): string {
    if (hoursRemaining < 0) {
        return "Expired";
    }

    if (hoursRemaining < 24) {
        return `${hoursRemaining}h remaining`;
    }

    if (daysRemaining === 1) {
        return "1 day remaining";
    }

    return `${daysRemaining} days remaining`;
}

/**
 * Get detailed tooltip message for retention status
 */
export function getRetentionTooltipMessage(status: RetentionStatus): string {
    if (!status.isExpiring) {
        return "Your resume has no expiration date";
    }

    if (status.urgencyLevel === "critical") {
        return `Your resume will be permanently deleted in ${status.hoursRemaining}h. Upgrade to Premium to keep it forever.`;
    }

    if (status.deletionDate) {
        const dateStr = status.deletionDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        return `Your resume will be permanently deleted on ${dateStr}. Upgrade to Premium to keep it forever.`;
    }

    return "Your resume will expire soon. Upgrade to Premium to keep it forever.";
}
