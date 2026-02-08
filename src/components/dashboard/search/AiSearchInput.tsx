import { Dispatch, SetStateAction } from "react";

interface AiSearchInputProps {
    aiQuery: string;
    setAiQuery: Dispatch<SetStateAction<string>>;
    onAiSearch: () => Promise<void>;
    aiSearching: boolean;
    aiError: string | null;
    aiQuota: { remaining: number; limit: number } | null;
    loading: boolean;
}

export function AiSearchInput({
    aiQuery,
    setAiQuery,
    onAiSearch,
    aiSearching,
    aiError,
    aiQuota,
    loading,
}: AiSearchInputProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-[black]">
                    <span className="h-1 w-1 rounded-full bg-cyan-500"></span>
                    Describe Your Ideal Candidate
                </label>
                {aiQuota && (
                    <span className="text-xs text-[black]/60">
                        {aiQuota.limit === -1 ? (
                            <span className="text-emerald-600">Unlimited searches</span>
                        ) : (
                            <span>
                                {aiQuota.remaining}/{aiQuota.limit} searches left
                            </span>
                        )}
                    </span>
                )}
            </div>
            <div className="relative">
                <textarea
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="e.g., Looking for a Java developer with 10 years experience and cloud tools like AWS or Azure..."
                    disabled={aiSearching}
                    rows={3}
                    className="w-full rounded-lg border-2 border-black bg-white px-4 py-3.5 text-slate-900 placeholder-slate-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] transition-all focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none focus:outline-none disabled:opacity-50 resize-none"
                />
            </div>
            <p className="flex items-start gap-2 text-xs leading-relaxed text-[black]/60">
                <svg
                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                    />
                </svg>
                Use natural language to describe skills, experience level,
                technologies, or any requirements
            </p>
            {aiError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {aiError}
                </div>
            )}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => onAiSearch()}
                    disabled={loading || aiSearching}
                    className="flex items-center gap-2 rounded-lg bg-black px-6 py-2.5 text-sm font-bold text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] border-2 border-black transition-all hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading || aiSearching ? (
                        <>
                            <svg
                                className="h-4 w-4 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Searching...
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            Smart Search
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
