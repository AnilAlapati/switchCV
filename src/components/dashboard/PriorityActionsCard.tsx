"use client";

import Link from "next/link";
import type { ActionItem } from "@/types/dashboard";

interface PriorityActionsCardProps {
    headline: string;
    items: ActionItem[];
    loading?: boolean;
    emptyMessage?: string;
}

const statusStyles: Record<ActionItem["status"], string> = {
    blocked: "bg-rose-50 text-rose-600 border border-rose-100",
    notStarted: "bg-slate-50 text-slate-600 border border-slate-200",
    inProgress: "bg-amber-50 text-amber-600 border border-amber-100",
    completed: "bg-emerald-50 text-emerald-600 border border-emerald-100",
};

const priorityAccent: Record<ActionItem["priority"], string> = {
    high: "text-rose-600",
    medium: "text-amber-600",
    low: "text-blue-600",
};

export function PriorityActionsCard({
    headline,
    items,
    loading,
    emptyMessage = "All caught up. Circle back tomorrow for new suggestions.",
}: PriorityActionsCardProps) {
    return (
        <section className="glass-panel rounded-3xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-6">
                <h2 className="text-xl font-bold text-[#1A2F25] flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </span>
                    {headline}
                </h2>
                {items.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
                        {items.length} Pending
                    </span>
                )}
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loading && (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-24 animate-pulse rounded-2xl bg-slate-800/50"
                            />
                        ))}
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-center p-6 rounded-2xl border border-dashed border-[#1A2F25]/10 bg-[#1A2F25]/5">
                        <svg className="h-12 w-12 text-[#1A2F25]/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-[#1A2F25]/60">
                            {emptyMessage}
                        </p>
                    </div>
                )}

                {!loading &&
                    items.map((item) => {
                        const StatusTag = (
                            <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusStyles[item.status]}`}
                            >
                                {item.status === "blocked" && "Blocked"}
                                {item.status === "notStarted" && "To Do"}
                                {item.status === "inProgress" && "In Progress"}
                                {item.status === "completed" && "Done"}
                            </span>
                        );

                        const CTAButton = item.cta ? (
                            item.cta.href ? (
                                <Link
                                    href={item.cta.href}
                                    target={item.cta.target}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 p-2 text-xs font-bold text-white transition hover:bg-indigo-700 shadow-md hover:shadow-lg"
                                >
                                    <span className="hidden sm:inline">{item.cta.label}</span>
                                    <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        />
                                    </svg>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={item.cta.onClick}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 p-2 text-xs font-bold text-white transition hover:bg-cyan-700 shadow-md hover:shadow-lg"
                                >
                                    <span className="hidden sm:inline">{item.cta.label}</span>
                                    <svg
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        />
                                    </svg>
                                </button>
                            )
                        ) : null;

                        return (
                            <article
                                key={item.id}
                                className="group relative rounded-2xl border border-white/60 bg-white/40 p-4 transition-all hover:bg-white/60 hover:border-white hover:shadow-md"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${priorityAccent[item.priority].replace('text-', 'bg-')}`}></div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            {StatusTag}
                                            <span className="text-[10px] text-[#1A2F25]/50 font-mono">
                                                {item.priority.toUpperCase()}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-bold text-[#1A2F25] mb-1 pr-8">
                                            {item.title}
                                        </h3>

                                        <p className="text-sm text-[#1A2F25]/70 line-clamp-2 mb-3">
                                            {item.description}
                                        </p>

                                        {item.meta && (
                                            <div className="flex items-center text-xs text-[#1A2F25]/60">
                                                <span className="mr-1.5">●</span>
                                                {item.meta}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="absolute top-4 right-4">
                                    {CTAButton}
                                </div>
                            </article>
                        );
                    })}
            </div>
        </section>
    );
}
