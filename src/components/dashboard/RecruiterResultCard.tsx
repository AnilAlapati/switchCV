import { SearchResult, SearchModeType } from "./RecruiterSearchForm";

interface RecruiterResultCardProps {
    result: SearchResult;
    searchMode: SearchModeType;
    badge: { label: string; classes: string; helper: string };
    analysis?: string;
    isAnalyzing: boolean;
    isDrafting: boolean;
    onViewResume: (resumeId: string) => void;
    onRequestAccess?: (resumeId: string, userName: string) => void;
    onDraftMessage: (result: SearchResult) => void;
    onAnalyzeMatch: (result: SearchResult) => void;
    isAgentLoading: boolean;
}

export function RecruiterResultCard({
    result,
    searchMode,
    badge,
    analysis,
    isAnalyzing,
    isDrafting,
    onViewResume,
    onRequestAccess,
    onDraftMessage,
    onAnalyzeMatch,
    isAgentLoading,
}: RecruiterResultCardProps) {
    const status = result.accessStatus ?? "none";
    const created = new Date(result.createdAt).toLocaleDateString();

    const renderActionArea = () => {
        if (status === "approved") {
            return (
                <button
                    onClick={() => onViewResume(result.resumeId)}
                    className="group relative w-full overflow-hidden rounded-lg bg-black px-4 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                        </svg>
                        View Full Resume
                    </span>
                </button>
            );
        }
        if (status === "pending") {
            return (
                <button
                    disabled
                    className="w-full rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800"
                >
                    <span className="flex items-center justify-center gap-2">
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Request Pending
                    </span>
                </button>
            );
        }
        if (status === "denied") {
            return (
                <button
                    onClick={() => onRequestAccess?.(result.resumeId, result.userName)}
                    className="group w-full rounded-lg border-2 border-rose-900 bg-white px-4 py-3 text-sm font-bold text-rose-900 transition-all hover:bg-rose-50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                    <span className="flex items-center justify-center gap-2">
                        Request Again
                    </span>
                </button>
            );
        }
        return (
            <div className="space-y-3">
                <button
                    onClick={() => onRequestAccess?.(result.resumeId, result.userName)}
                    className="group relative w-full overflow-hidden rounded-lg bg-black px-4 py-3 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        Request Access
                    </span>
                </button>

                {/* AGENT ACTIONS */}
                <div className="flex gap-2">
                    <button
                        onClick={() => onDraftMessage(result)}
                        disabled={isDrafting || isAgentLoading}
                        className="flex-1 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                        {isDrafting ? "Drafting..." : "✨ Draft Msg"}
                    </button>
                    <button
                        onClick={() => onAnalyzeMatch(result)}
                        disabled={isAnalyzing}
                        className="flex-1 rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                    >
                        {isAnalyzing ? "Thinking..." : "🧠 Analyze"}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <article
            className="group bg-white rounded-xl border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px]"
        >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start gap-3">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-slate-50 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <svg
                                className="h-7 w-7 text-slate-900"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold font-serif text-slate-900">
                                {result.title}
                            </h4>
                            <p className="text-sm text-slate-600 font-medium font-sans">
                                {result.userName}
                            </p>
                        </div>
                        <span className="rounded-full border-2 border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
                            #{result.userId.substring(0, 8)}
                        </span>
                    </div>

                    {result.skills && result.skills.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-wide text-[black]/50 font-bold">
                                Core skills
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {result.skills.map((skill, idx) => (
                                    <span
                                        key={`${result.resumeId}-skill-${idx}`}
                                        className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700"
                                    >
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ANALYSIS RESULT AREA */}
                    {analysis && (
                        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-indigo-600">🧠</span>
                                <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                                    AI Analysis
                                </span>
                            </div>
                            <div className="prose prose-sm prose-indigo max-w-none text-sm text-indigo-900/80">
                                {/* Simple markdown rendering */}
                                <pre className="whitespace-pre-wrap font-sans text-sm">
                                    {analysis}
                                </pre>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs text-[black]/60 font-medium">
                        {result.location && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/50 px-3 py-1">
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
                                        d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 11c-3 0-5 2.239-5 5v2h10v-2c0-2.761-2-5-5-5z"
                                    />
                                </svg>
                                {result.location}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/50 px-3 py-1">
                            Posted {created}
                        </span>
                    </div>
                </div>

                <div className="w-full rounded-xl border-2 border-slate-200 bg-slate-50/50 p-5 lg:w-80">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-cyan-500 border border-black"></span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Access Status
                            </span>
                        </div>
                        <span className="rounded-full border-2 border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {searchMode === "basic" ? "Direct" : "Premium"}
                        </span>
                    </div>
                    <div
                        className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide ${badge.classes}`}
                    >
                        <span className="h-2 w-2 rounded-full border border-black bg-current"></span>
                        {badge.label}
                    </div>
                    <p className="mb-5 text-xs leading-relaxed text-slate-600 font-medium">
                        {badge.helper}
                    </p>
                    {renderActionArea()}
                </div>
            </div>
        </article>
    );
}
