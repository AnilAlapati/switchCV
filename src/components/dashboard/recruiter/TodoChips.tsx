"use client";

import Link from "next/link";
import type { ActionItem } from "@/types/dashboard";

interface TodoChipsProps {
    items: ActionItem[];
    loading: boolean;
}

const statusIcon: Record<ActionItem["status"], string> = {
    blocked: "🔴",
    notStarted: "⚪",
    inProgress: "🟡",
    completed: "🟢",
};

const priorityStyles: Record<ActionItem["priority"], string> = {
    high: "border-rose-200 bg-rose-50/60 hover:border-rose-400",
    medium: "border-amber-200 bg-amber-50/60 hover:border-amber-400",
    low: "border-blue-200 bg-blue-50/60 hover:border-blue-400",
};

export function TodoChips({ items, loading }: TodoChipsProps) {
    if (loading) {
        return (
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <span className="h-1 w-1 bg-black" />
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                        Priority Actions
                    </h3>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-10 w-48 animate-pulse bg-gray-100 border border-gray-200 rounded-full" />
                    ))}
                </div>
            </section>
        );
    }

    if (items.length === 0) {
        return (
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <span className="h-1 w-1 bg-black" />
                    <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                        Priority Actions
                    </h3>
                </div>
                <p className="text-sm text-gray-400 font-sans">
                    No urgent items — you&apos;re all caught up! ✨
                </p>
            </section>
        );
    }

    return (
        <section>
            <div className="flex items-center gap-2 mb-3">
                <span className="h-1 w-1 bg-black" />
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                    Priority Actions
                </h3>
                <span className="ml-auto text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                    {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                    const chip = (
                        <div
                            className={`inline-flex items-center gap-2 px-4 py-2 border-2 rounded-full text-sm font-sans transition-all duration-200 cursor-pointer group ${priorityStyles[item.priority]}`}
                        >
                            <span className="text-xs">{statusIcon[item.status]}</span>
                            <span className="font-medium text-gray-800 text-xs whitespace-nowrap">
                                {item.title}
                            </span>
                            {item.meta && (
                                <span className="text-[10px] font-mono font-bold text-gray-400 bg-white/80 px-1.5 py-0.5 rounded-full border border-gray-200">
                                    {item.meta}
                                </span>
                            )}
                        </div>
                    );

                    if (item.cta?.href) {
                        return (
                            <Link key={item.id} href={item.cta.href} target={item.cta.target}>
                                {chip}
                            </Link>
                        );
                    }

                    if (item.cta?.onClick) {
                        return (
                            <button key={item.id} type="button" onClick={item.cta.onClick}>
                                {chip}
                            </button>
                        );
                    }

                    return <div key={item.id}>{chip}</div>;
                })}
            </div>
        </section>
    );
}
