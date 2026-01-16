"use client";

import { useState } from "react";
import { ResumeRetentionBadge } from "@/components/dashboard/ResumeRetentionBadge";
import {
    calculateRetentionStatus,
} from "@/lib/utils/resumeRetention";

/**
 * Test page to showcase all resume retention badge variants
 * Access: http://localhost:3000/test-retention
 */
export default function TestRetentionPage() {
    const [selectedVariant, setSelectedVariant] = useState<"inline" | "card" | "banner">("inline");

    // Test scenarios with absolute dates that will work on Jan 15-16, 2026
    const scenarios = [
        {
            name: "Critical - 6 hours remaining",
            deletionScheduledAt: "2026-01-16T05:00:00.000Z",
            expiresAt: "2026-01-13T05:00:00.000Z",
        },
        {
            name: "Urgent - 20 hours remaining",
            deletionScheduledAt: "2026-01-16T17:00:00.000Z",
            expiresAt: "2026-01-13T17:00:00.000Z",
        },
        {
            name: "Warning - 2 days remaining",
            deletionScheduledAt: "2026-01-18T00:00:00.000Z",
            expiresAt: "2026-01-15T00:00:00.000Z",
        },
        {
            name: "Safe - 5 days remaining",
            deletionScheduledAt: "2026-01-21T00:00:00.000Z",
            expiresAt: "2026-01-18T00:00:00.000Z",
        },
        {
            name: "No expiration (Premium user)",
            deletionScheduledAt: null,
            expiresAt: null,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-[black] mb-2">
                        Resume Retention Badge Test
                    </h1>
                    <p className="text-[black]/70">
                        Showcase of all design variants and urgency levels
                    </p>
                    <p className="text-sm text-[black]/50 mt-2">
                        Current time: {new Date().toLocaleString()}
                    </p>
                </div>

                {/* Variant Selector */}
                <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-[black] shadow-lg">
                    <h2 className="text-xl font-bold text-[black] mb-4">Select Variant</h2>
                    <div className="flex gap-4">
                        {(["inline", "card", "banner"] as const).map((variant) => (
                            <button
                                key={variant}
                                onClick={() => setSelectedVariant(variant)}
                                className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedVariant === variant
                                        ? "bg-[black] text-white border-2 border-[black]"
                                        : "bg-white text-[black] border-2 border-[black] hover:bg-[black]/5"
                                    }`}
                            >
                                {variant.charAt(0).toUpperCase() + variant.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scenarios Grid */}
                <div className="space-y-6">
                    {scenarios.map((scenario, index) => {
                        const status = calculateRetentionStatus(
                            scenario.deletionScheduledAt,
                            scenario.expiresAt,
                            "basic"
                        );

                        return (
                            <div
                                key={index}
                                className="p-6 bg-white rounded-2xl border-2 border-[black] shadow-lg"
                            >
                                <div className="mb-4">
                                    <h3 className="text-2xl font-bold text-[black] mb-1">
                                        {scenario.name}
                                    </h3>
                                    {status.isExpiring && (
                                        <div className="flex gap-4 text-sm text-[black]/60">
                                            <span>Days: {status.daysRemaining}</span>
                                            <span>Hours: {status.hoursRemaining}</span>
                                            <span className="font-bold">Urgency: {status.urgencyLevel}</span>
                                            {scenario.deletionScheduledAt && (
                                                <span>Deletion: {new Date(scenario.deletionScheduledAt).toLocaleString()}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 bg-slate-50 rounded-xl min-h-[80px] flex items-center">
                                    <ResumeRetentionBadge
                                        deletionScheduledAt={scenario.deletionScheduledAt}
                                        expiresAt={scenario.expiresAt}
                                        variant={selectedVariant}
                                        showUpgradeLink={true}
                                    />
                                    {!status.isExpiring && (
                                        <p className="text-[black]/60 text-sm">
                                            No retention badge shown (Premium user or no expiration)
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Email Template Preview */}
                <div className="mt-12 p-6 bg-white rounded-2xl border-2 border-[black] shadow-lg">
                    <h2 className="text-2xl font-bold text-[black] mb-4">
                        📧 Email Notification Preview
                    </h2>
                    <p className="text-[black]/70 mb-4">
                        The email template "resumeExpiryWarning" will be sent to users 24-48 hours before deletion.
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <p className="text-sm font-mono text-[black]/80">
                            Subject: ⏰ Your Resume Will Be Deleted in [TIME] - SwitchCV
                        </p>
                        <p className="text-xs text-[black]/60 mt-2">
                            View full template in:{" "}
                            <code className="bg-white px-2 py-1 rounded">
                                functions/src/services/emailService.ts
                            </code>
                        </p>
                    </div>
                </div>

                {/* Implementation Status */}
                <div className="mt-12 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-600">
                    <h2 className="text-2xl font-bold text-emerald-900 mb-4">
                        ✅ Implementation Complete
                    </h2>
                    <ul className="space-y-2 text-emerald-800">
                        <li>✓ Type system updated with expiration fields</li>
                        <li>✓ Utility functions for retention calculations</li>
                        <li>✓ Three UI design variants (inline, card, banner)</li>
                        <li>✓ Color-coded urgency indicators</li>
                        <li>✓ Email template with upgrade CTA</li>
                        <li>✓ Scheduled Cloud Function (runs daily at 9 AM UTC)</li>
                        <li>✓ Notification tracking to prevent duplicates</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
