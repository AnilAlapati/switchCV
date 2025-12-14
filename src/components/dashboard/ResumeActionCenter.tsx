"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ResumeActionCenterProps {
    hasResume: boolean;
    resumeId: string | number | null;
    resumeLoading: boolean;
    isPublished: boolean;
    lastUpdated?: string | Date | null;
    onRefresh?: () => void;
}

export function ResumeActionCenter({
    hasResume,
    resumeId,
    resumeLoading,
    isPublished,
    lastUpdated,
    onRefresh,
}: ResumeActionCenterProps) {
    const resumeIdString = resumeId ? String(resumeId) : null;

    const statusColor = isPublished ? "text-emerald-500" : "text-amber-500";
    const statusBg = isPublished ? "bg-emerald-500/10" : "bg-amber-500/10";
    const statusBorder = isPublished ? "border-emerald-500/20" : "border-amber-500/20";
    const statusText = isPublished ? "Live" : "Draft";
    const textColor = "text-[#1A2F25]";
    const mutedTextColor = "text-[#1A2F25]/70";

    if (resumeLoading) {
        return (
            <div className="glass-panel overflow-hidden rounded-3xl p-8 animate-pulse">
                <div className="h-8 w-1/3 bg-slate-700/50 rounded mb-4"></div>
                <div className="h-4 w-1/2 bg-slate-700/30 rounded"></div>
            </div>
        );
    }

    if (!hasResume) {
        return (
            <div className="glass-panel relative overflow-hidden rounded-3xl p-8">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl"></div>

                <div className="relative z-10">
                    <h2 className="text-2xl font-bold text-[#1A2F25] mb-2">Create Your Resume</h2>
                    <p className="text-[#1A2F25] mb-6 max-w-lg font-medium">
                        Build a professional resume in minutes. Our AI-powered tools help you highlight your strengths and get noticed by recruiters.
                    </p>

                    <Link
                        href="/create-resume"
                        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:scale-[1.02]"
                    >
                        <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Start Building
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel relative overflow-hidden rounded-3xl p-0">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 opacity-50"></div>

            <div className="relative z-10 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusBg} ${statusColor} ${statusBorder} mb-3`}>
                            <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isPublished ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {statusText}
                        </div>
                        <h2 className="text-2xl font-bold text-[#1A2F25]">My Resume</h2>
                        {lastUpdated && (
                            <p className="text-sm text-[#1A2F25]/60 mt-1">
                                Last updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Link
                            href={`/resumes/${resumeIdString}/edit`}
                            className="inline-flex items-center justify-center rounded-xl bg-white/50 px-4 py-2.5 text-sm font-medium text-[#1A2F25] backdrop-blur-sm transition-all hover:bg-white/80 border border-white/20 shadow-sm"
                        >
                            <svg className="mr-2 h-4 w-4 text-[#1A2F25]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                        </Link>

                        <Link
                            href={`/resumes/${resumeIdString}/preview`}
                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:scale-[1.02]"
                        >
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-[#1A2F25]/10">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/40 border border-white/60">
                        <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-[#1A2F25] font-medium mb-1">Boost Visibility</h3>
                            <p className="text-sm text-[#1A2F25]/60">Optimize keywords to appear in more recruiter searches.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/40 border border-white/60">
                        <div className="p-2.5 rounded-xl bg-pink-50 text-pink-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-[#1A2F25] font-medium mb-1">Share Profile</h3>
                            <p className="text-sm text-[#1A2F25]/60">Send your profile link directly to hiring managers.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
