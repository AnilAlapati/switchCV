import React from "react";
import Link from "next/link";

export function AIEditMissingIdView() {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <p className="text-gray-300">Resume ID is missing from the URL.</p>
        </div>
    );
}

export function AIEditLoadingView({ tier }: { tier: string | null }) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 text-lg">
                    {tier === "basic" ? "Redirecting..." : "Loading editor…"}
                </p>
            </div>
        </div>
    );
}

export function ResumeMissingNotice() {
    return (
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 text-yellow-200">
            <p className="font-semibold mb-2">No resume on file yet</p>
            <p className="text-sm mb-3">
                I can only edit an existing resume. Start by creating one with
                our AI Resume Builder, then return here to keep refining it.
            </p>
            <Link
                href="/create-resume"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-semibold rounded-lg"
            >
                Launch AI Resume Builder
            </Link>
        </div>
    );
}
