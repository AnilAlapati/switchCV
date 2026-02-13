import React from "react";
import { User } from "firebase/auth";

export type DeletionCountdownNotice = {
    label: string;
    deletionLabel: string;
    severity: "warning" | "danger";
    warningHours: number | null;
};

export const formatDuration = (ms: number) => {
    if (ms <= 0) {
        return "moments";
    }

    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];

    if (days > 0) {
        parts.push(`${days} day${days === 1 ? "" : "s"}`);
    }

    if (hours > 0) {
        parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    }

    if (parts.length === 0) {
        parts.push(`${minutes || 1} minute${minutes === 1 ? "" : "s"}`);
    }

    return parts.slice(0, 2).join(" ");
};

const bannerStyles = {
    warning: "border-amber-400 bg-amber-500/10 text-amber-100",
    danger: "border-red-400 bg-red-500/10 text-red-100",
};

export function DeletionCountdownBanner({
    notice,
}: {
    notice: DeletionCountdownNotice;
}) {
    return (
        <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm leading-relaxed ${bannerStyles[notice.severity]
                }`}
            role="status"
        >
            <p className="font-semibold text-base">
                Resume scheduled for deletion in {notice.label}
            </p>
            <p>
                This Basic plan resume will be permanently removed on{" "}
                <span className="font-semibold">{notice.deletionLabel}</span> unless you
                upgrade or duplicate it to keep a copy.
            </p>
            {typeof notice.warningHours === "number" && (
                <p className="text-xs opacity-80 mt-1">
                    Countdown warnings start {notice.warningHours} hours before deletion
                    so you have time to upgrade.
                </p>
            )}
        </div>
    );
}

export function EditingInProgressBanner() {
    return (
        <div
            className="mb-4 rounded-lg border border-blue-400 bg-blue-500/10 px-4 py-3 text-sm leading-relaxed text-blue-100"
            role="status"
        >
            <p className="font-semibold text-base">
                📝 This resume is currently being edited
            </p>
            <p>
                The owner is making updates to this resume. Some information may be
                outdated until editing is complete.
            </p>
        </div>
    );
}

export function ResumeErrorView({ error, user }: { error: string, user: User | null }) {
    return (
        <div className="min-h-screen bg-[#FFFFF8] flex items-center justify-center text-black flex-col gap-2 relative overflow-hidden selection:bg-black selection:text-white">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
            <div className="relative z-10 bg-[#F5F5F0] border border-black/10 p-10 shadow-2xl">
                <p className="text-red-600 text-xl font-serif">Error: {error}</p>
                {user && <p className="text-gray-500 text-sm font-sans mt-2">User ID: {user.uid}</p>}
            </div>
        </div>
    );
}

export function ResumeNotFoundView() {
    return (
        <div className="min-h-screen bg-[#FFFFF8] flex items-center justify-center text-black relative overflow-hidden selection:bg-black selection:text-white">
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
            <div className="relative z-10 bg-[#F5F5F0] border border-black/10 p-10 shadow-2xl font-serif">
                Resume not found
            </div>
        </div>
    );
}
