import Link from "next/link";
import { Lock } from "lucide-react";
import { SearchModeType } from "../RecruiterSearchForm";

interface SearchModeSelectorProps {
    searchMode: SearchModeType;
    handleModeSwitch: (mode: SearchModeType) => void;
    aiSearchEnabled: boolean;
    premiumFiltersEnabled: boolean;
}

export function SearchModeSelector({
    searchMode,
    handleModeSwitch,
    aiSearchEnabled,
    premiumFiltersEnabled,
}: SearchModeSelectorProps) {
    return (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 bg-black animate-pulse"></div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                        Search Mode
                    </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 border border-gray-200">
                    Switch Anytime
                </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                {/* AI Search Mode */}
                <div className="relative h-full">
                    {!aiSearchEnabled ? (
                        <div className="group relative flex h-full flex-col gap-4 rounded-2xl border-2 border-slate-200/80 bg-white/80 p-5 text-left overflow-hidden">
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] p-4 text-center">
                                <div className="mb-3 rounded-2xl bg-white p-3 shadow-lg">
                                    <Lock className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h3 className="mb-1 text-sm font-bold text-[black]">
                                    Agent Search
                                </h3>
                                <p className="mb-4 text-xs text-[black]/60">
                                    Unlock with Premium or Enterprise
                                </p>
                                <Link
                                    href="/profile/subscription"
                                    className="bg-black px-4 py-2 text-xs font-bold text-white border-2 border-black transition-colors hover:bg-white hover:text-black"
                                >
                                    Upgrade Now
                                </Link>
                            </div>

                            <div className="opacity-20 blur-[1px] pointer-events-none flex h-full flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-500">
                                        ✨
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[black]/40">
                                        Agentic
                                    </span>
                                </div>
                                <div>
                                    <span className="block font-bold text-[black]">
                                        Agent Search
                                    </span>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                        Requires Premium or Enterprise
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleModeSwitch("ai")}
                            className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${searchMode === "ai"
                                    ? "border-teal-400 bg-gradient-to-br from-cyan-100 to-teal-100 text-slate-800 shadow-lg shadow-teal-200/50"
                                    : "border-slate-200/80 bg-white/80 hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-md hover:scale-[1.01]"
                                }`}
                        >
                            <div className="flex w-full items-start justify-between">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl transition-all duration-300 ${searchMode === "ai"
                                            ? "bg-white/20 text-white"
                                            : "bg-indigo-100 text-indigo-500 group-hover:bg-indigo-200 group-hover:text-indigo-600"
                                        }`}
                                >
                                    ✨
                                </div>
                                <span
                                    className={`text-[10px] font-black uppercase tracking-widest ${searchMode === "ai" ? "text-teal-700" : "text-indigo-400"
                                        }`}
                                >
                                    Agentic
                                </span>
                            </div>
                            <div>
                                <span
                                    className={`block font-bold ${searchMode === "ai"
                                            ? "text-teal-900"
                                            : "text-slate-800 group-hover:text-indigo-700"
                                        }`}
                                >
                                    Agent Search
                                </span>
                                <p
                                    className={`mt-1 text-xs leading-relaxed ${searchMode === "ai" ? "text-teal-700" : "text-slate-500"
                                        }`}
                                >
                                    Natural language search powered by autonomous agents
                                </p>
                            </div>
                        </button>
                    )}
                </div>

                {/* Basic Lookup Mode */}
                <button
                    type="button"
                    onClick={() => handleModeSwitch("basic")}
                    className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${searchMode === "basic"
                            ? "border-blue-400 bg-gradient-to-br from-blue-100 to-sky-100 text-slate-800 shadow-lg shadow-blue-200/50"
                            : "border-slate-200/80 bg-white/80 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md hover:scale-[1.01]"
                        }`}
                >
                    <div className="flex w-full items-start justify-between">
                        <div
                            className={`flex h-12 w-12 items-center justify-center rounded-xl text-base font-black transition-all duration-300 ${searchMode === "basic"
                                    ? "bg-blue-200/50 text-blue-700"
                                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                                }`}
                        >
                            ID
                        </div>
                    </div>
                    <div>
                        <span
                            className={`block text-base font-bold transition-colors ${searchMode === "basic"
                                    ? "text-blue-900"
                                    : "text-slate-800 group-hover:text-slate-900"
                                }`}
                        >
                            Basic Lookup
                        </span>
                        <p
                            className={`mt-1.5 text-xs leading-relaxed ${searchMode === "basic" ? "text-blue-700" : "text-slate-500"
                                }`}
                        >
                            Quickly retrieve a Specific candidate using their Resume ID
                        </p>
                    </div>
                </button>

                {/* Premium Filters Mode */}
                <div className="relative h-full">
                    {!premiumFiltersEnabled ? (
                        <div className="group relative flex h-full flex-col gap-4 rounded-2xl border-2 border-slate-200/80 bg-white/80 p-5 text-left overflow-hidden">
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] p-4 text-center">
                                <div className="mb-3 rounded-2xl bg-white p-3 shadow-lg">
                                    <Lock className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h3 className="mb-1 text-sm font-bold text-[black]">
                                    Premium Filters
                                </h3>
                                <p className="mb-4 text-xs text-[black]/60">
                                    Unlock with Premium or Enterprise
                                </p>
                                <Link
                                    href="/profile/subscription"
                                    className="bg-black px-4 py-2 text-xs font-bold text-white border-2 border-black transition-colors hover:bg-white hover:text-black"
                                >
                                    Upgrade Now
                                </Link>
                            </div>

                            <div className="opacity-20 blur-[1px] pointer-events-none flex h-full flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-500">
                                        ★
                                    </div>
                                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                        SOON
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-base font-bold text-[black]">
                                        Premium Filters
                                    </span>
                                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                                        Advanced filters will arrive soon for premium recruiters.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => handleModeSwitch("premium")}
                            className={`group relative flex h-full flex-col justify-between gap-4 rounded-2xl border-2 p-5 text-left transition-all duration-300 ${searchMode === "premium"
                                    ? "border-rose-300 bg-gradient-to-br from-rose-100 to-pink-100 text-slate-800 shadow-lg shadow-rose-200/50"
                                    : "border-slate-200/80 bg-white/80 hover:border-rose-300 hover:bg-rose-50/40 hover:shadow-md hover:scale-[1.01]"
                                }`}
                        >
                            <div className="flex w-full items-start justify-between">
                                <div
                                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg transition-all duration-300 ${searchMode === "premium"
                                            ? "bg-rose-200/50 text-rose-700"
                                            : "bg-amber-100 text-amber-500 group-hover:bg-amber-200 group-hover:text-amber-600"
                                        }`}
                                >
                                    ★
                                </div>
                            </div>
                            <div>
                                <span
                                    className={`block text-base font-bold transition-colors ${searchMode === "premium"
                                            ? "text-rose-900"
                                            : "text-slate-800 group-hover:text-amber-700"
                                        }`}
                                >
                                    Premium Filters
                                </span>
                                <p
                                    className={`mt-1.5 text-xs leading-relaxed ${searchMode === "premium"
                                            ? "text-rose-700"
                                            : "text-slate-500"
                                        }`}
                                >
                                    Advanced search with skills and location filters
                                </p>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
