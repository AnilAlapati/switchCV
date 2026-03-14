"use client";

import { useState } from "react";
import { useAiMonitoring } from "@/hooks/useAiMonitoring";

export function TraceView() {
    const [searchInput, setSearchInput] = useState("");
    const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

    const { data, loading, error } = useAiMonitoring({
        requestId: activeRequestId || undefined,
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchInput.trim()) {
            setActiveRequestId(searchInput.trim());
        }
    };

    const handleClear = () => {
        setSearchInput("");
        setActiveRequestId(null);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                    Request Trace Lookup
                </h2>
                <form onSubmit={handleSearch} className="flex gap-4">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Enter Request ID..."
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={!searchInput.trim()}
                        className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Search
                    </button>
                    {activeRequestId && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="px-6 py-2 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </form>
            </div>

            {loading && activeRequestId && (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </div>
            )}

            {error && activeRequestId && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {data?.requestTrace && activeRequestId && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {!data.requestTrace.summary ? (
                        <div className="bg-amber-50 text-amber-800 p-6 rounded-xl border border-amber-200">
                            <h3 className="font-bold text-lg mb-2">Request Not Found</h3>
                            <p>No summary found for request ID: {activeRequestId}</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Card */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">
                                            Request Summary
                                        </h3>
                                        <div className="text-sm text-slate-500 font-mono mt-1">
                                            {data.requestTrace.summary.requestId}
                                        </div>
                                    </div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-sm font-semibold ${data.requestTrace.summary.status === "success"
                                                ? "bg-emerald-100 text-emerald-800"
                                                : data.requestTrace.summary.status === "degraded"
                                                    ? "bg-amber-100 text-amber-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {data.requestTrace.summary.status.toUpperCase()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Entrypoint
                                        </div>
                                        <div className="mt-1 font-medium text-slate-900">
                                            {data.requestTrace.summary.entrypoint}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Duration
                                        </div>
                                        <div className="mt-1 font-medium text-slate-900">
                                            {data.requestTrace.summary.durationMs
                                                ? `${data.requestTrace.summary.durationMs}ms`
                                                : "N/A"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Failures / Fallbacks
                                        </div>
                                        <div className="mt-1 font-medium text-slate-900">
                                            {data.requestTrace.summary.failureCount} /{" "}
                                            {data.requestTrace.summary.fallbackCount}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            User Visible Failure
                                        </div>
                                        <div className="mt-1 font-medium text-slate-900">
                                            {data.requestTrace.summary.userVisibleFailure ? "Yes" : "No"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Events Timeline */}
                            {data.requestTrace.events.length > 0 && (
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6">
                                        Failure Events Timeline
                                    </h3>
                                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                        {data.requestTrace.events.map((event, i) => (
                                            <div
                                                key={event.id}
                                                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                                            >
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                    {i + 1}
                                                </div>
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-semibold text-slate-900 text-sm">
                                                            {event.stage}
                                                        </h4>
                                                        <span className="text-red-500 font-bold text-sm">
                                                            {event.failureCode}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mb-3">
                                                        {event.createdAt
                                                            ? new Date(event.createdAt).toLocaleString(
                                                                undefined,
                                                                {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    second: "2-digit",
                                                                }
                                                            )
                                                            : "N/A"}
                                                    </div>
                                                    <div className="text-sm text-slate-700 font-mono bg-slate-50 p-2 rounded border border-slate-100 mb-2 whitespace-pre-wrap break-all">
                                                        {event.errorMessage}
                                                    </div>
                                                    <div className="flex gap-2 text-xs text-slate-500">
                                                        {event.provider && (
                                                            <span className="bg-slate-100 px-2 py-1 rounded">
                                                                Provider: {event.provider}
                                                            </span>
                                                        )}
                                                        {event.model && (
                                                            <span className="bg-slate-100 px-2 py-1 rounded">
                                                                Model: {event.model}
                                                            </span>
                                                        )}
                                                        {event.latencyMs && (
                                                            <span className="bg-slate-100 px-2 py-1 rounded">
                                                                Latency: {event.latencyMs}ms
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
