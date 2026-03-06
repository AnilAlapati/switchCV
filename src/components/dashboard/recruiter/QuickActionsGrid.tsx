"use client";

import Link from "next/link";
import { Search, FileText, Clock, BarChart3 } from "lucide-react";
import type { ReactElement } from "react";

interface QuickAction {
    id: string;
    title: string;
    description: string;
    href: string;
    icon: ReactElement;
    accentBg: string;
    accentText: string;
    hoverBorder: string;
}

const quickActions: QuickAction[] = [
    {
        id: "ai-search",
        title: "AI Talent Search",
        description: "Describe your ideal candidate in natural language",
        href: "/recruiter/search",
        icon: <Search className="h-6 w-6" />,
        accentBg: "bg-blue-50",
        accentText: "text-blue-600",
        hoverBorder: "hover:border-blue-400",
    },
    {
        id: "jd-search",
        title: "JD-Powered Search",
        description: "Upload a job description to find matches",
        href: "/recruiter/search?mode=jd",
        icon: <FileText className="h-6 w-6" />,
        accentBg: "bg-emerald-50",
        accentText: "text-emerald-600",
        hoverBorder: "hover:border-emerald-400",
    },
    {
        id: "requests",
        title: "Access Requests",
        description: "Manage pending and approved requests",
        href: "/dashboard/recruiter/requests",
        icon: <Clock className="h-6 w-6" />,
        accentBg: "bg-amber-50",
        accentText: "text-amber-600",
        hoverBorder: "hover:border-amber-400",
    },
    {
        id: "analytics",
        title: "Pipeline Analytics",
        description: "Track your recruiting performance",
        href: "/analytics",
        icon: <BarChart3 className="h-6 w-6" />,
        accentBg: "bg-purple-50",
        accentText: "text-purple-600",
        hoverBorder: "hover:border-purple-400",
    },
];

export function QuickActionsGrid() {
    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <span className="h-1 w-1 bg-black" />
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                    Quick Actions
                </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {quickActions.map((action) => (
                    <Link
                        key={action.id}
                        href={action.href}
                        className={`group relative flex flex-col gap-4 bg-white border-2 border-black p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] ${action.hoverBorder}`}
                    >
                        {/* Icon */}
                        <div
                            className={`flex h-12 w-12 items-center justify-center ${action.accentBg} ${action.accentText} transition-transform duration-300 group-hover:scale-110`}
                        >
                            {action.icon}
                        </div>

                        {/* Content */}
                        <div>
                            <h4 className="text-sm font-bold text-black group-hover:text-blue-600 transition-colors">
                                {action.title}
                            </h4>
                            <p className="mt-1 text-xs text-gray-500 font-sans leading-relaxed">
                                {action.description}
                            </p>
                        </div>

                        {/* Arrow indicator */}
                        <div className="absolute top-5 right-5 opacity-0 transform translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                            <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
