import React from "react";
import Link from "next/link";
import { TabKey } from "./types";

export function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-cyan-500/20 border-t-cyan-400 mb-5"></div>
            <p className="text-slate-400 text-base font-semibold">
                Loading requests...
            </p>
        </div>
    );
}

export function ErrorState({ error }: { error: string }) {
    return (
        <div className="text-center bg-red-950/30 border border-red-800/50 backdrop-blur-sm p-12 rounded-2xl shadow-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-5">
                <svg
                    className="w-8 h-8 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>
            <h3 className="text-red-300 text-xl font-bold mb-2">
                Error Loading Requests
            </h3>
            <p className="text-red-400/80 text-sm">{error}</p>
        </div>
    );
}

export function EmptyState({
    viewType: _viewType, // eslint-disable-line @typescript-eslint/no-unused-vars
    title,
    description
}: {
    viewType: "available" | "contact" | "requests",
    title: string,
    description: string
}) {
    return (
        <div className="text-center bg-white border-2 border-black p-16 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 border-2 border-black mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <svg
                    className="w-10 h-10 text-slate-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
            </div>
            <h3 className="text-slate-900 font-serif text-2xl font-bold mb-3">
                {title}
            </h3>
            <p className="text-slate-600 text-base max-w-md mx-auto mb-8 font-medium">
                {description}
            </p>
            <Link
                href="/recruiter/search"
                className="inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-slate-800 text-white rounded-lg font-bold transition-all duration-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
                <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                Search Candidates
            </Link>
        </div>
    );
}

interface TabSwitcherProps {
    activeTab: TabKey;
    onTabChange: (tab: TabKey) => void;
    tabConfig: Array<{ key: TabKey; label: string; count: number }>;
}

export function TabSwitcher({ activeTab, onTabChange, tabConfig }: TabSwitcherProps) {
    return (
        <div className="flex gap-2 p-1.5 rounded-lg bg-white border-2 border-slate-200 w-fit">
            {tabConfig.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={`relative py-2.5 px-6 rounded-md text-sm font-bold transition-all duration-200 border-2 ${activeTab === tab.key
                        ? "bg-slate-900 border-slate-900 text-white shadow-md"
                        : "bg-transparent border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        }`}
                >
                    <span className="flex items-center justify-center gap-2.5">
                        {tab.label}
                        <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${activeTab === tab.key
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-600"
                                }`}
                        >
                            {tab.count}
                        </span>
                    </span>
                </button>
            ))}
        </div>
    );
}

export function EmptyTabContent({ message, showAction }: { message: string, showAction?: boolean }) {
    return (
        <div className="text-center p-14 rounded-xl bg-white border-2 border-dashed border-slate-300">
            <div className="flex justify-center mb-5">
                <div className="p-5 rounded-full bg-slate-50 border-2 border-slate-200">
                    <svg
                        className="w-12 h-12 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                </div>
            </div>
            <p className="text-slate-900 text-lg font-serif font-bold">
                {message}
            </p>
            {showAction && (
                <p className="text-slate-500 text-sm mt-2 font-medium">
                    Request access to candidate resumes to see them here
                </p>
            )}
        </div>
    );
}

export function PageHeader({
    isAvailableResumesView,
    isContactHistoryView
}: {
    isAvailableResumesView: boolean;
    isContactHistoryView: boolean;
}) {
    return (
        <div className="flex items-center justify-between mb-10">
            <div>
                <h1 className="text-4xl font-serif font-bold tracking-tight text-slate-900">
                    {isAvailableResumesView
                        ? "Available Resumes"
                        : isContactHistoryView
                            ? "Candidates Contacted"
                            : "Access Requests"}
                </h1>
                <p className="text-slate-600 mt-2.5 text-base font-sans font-medium">
                    {isAvailableResumesView
                        ? "Manage approved resume access and view candidate profiles"
                        : isContactHistoryView
                            ? "View all candidates you've contacted and their response status"
                            : "Track and manage your candidate access requests"}
                </p>
            </div>
            <Link
                href="/dashboard"
                className="group flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-900 text-sm font-bold transition-all duration-200 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
                Dashboard
            </Link>
        </div>
    );
}
