"use client";

interface ActivityPulseFeedProps {
    recentEvents: any[];
}

export function ActivityPulseFeed({ recentEvents }: ActivityPulseFeedProps) {
    return (
        <div className="glass-panel rounded-2xl p-8 border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-extrabold text-[#1A2F25] tracking-tight flex items-center gap-3">
                        Recent Activity Pulse
                    </h2>
                    <p className="text-[#1A2F25]/60 text-sm mt-1">
                        Direct visibility into who is engaging with your profile.
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-100">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        Live Monitoring
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {recentEvents.length > 0 ? (
                    recentEvents.map((event, index) => (
                        <div
                            key={event.eventId || index}
                            className="group flex items-center justify-between p-4 rounded-xl transition-all hover:bg-white/60 hover:shadow-sm border border-transparent hover:border-slate-100"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm border ${event.eventType === "view"
                                            ? "bg-blue-50 text-blue-600 border-blue-100"
                                            : event.eventType === "request"
                                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        }`}
                                >
                                    {event.eventType === "view"
                                        ? "👁️"
                                        : event.eventType === "request"
                                            ? "📋"
                                            : "✅"}
                                </div>
                                <div>
                                    <p className="text-[#1A2F25] font-bold capitalize">
                                        {event.eventType} Event
                                    </p>
                                    <p className="text-[#1A2F25]/50 text-xs font-medium">
                                        {event.metadata?.source
                                            ? `Via ${event.metadata.source}`
                                            : "Direct Source"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[#1A2F25] text-xs font-bold">
                                    {new Date(event.timestamp).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </p>
                                <p className="text-[#1A2F25]/40 text-[10px] font-bold uppercase mt-0.5">
                                    {new Date(event.timestamp).toLocaleTimeString(undefined, {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-50/30 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-3xl mb-4">🌑</p>
                        <h4 className="text-lg font-bold text-[#1A2F25] mb-2">
                            The pulse is quiet
                        </h4>
                        <p className="text-[#1A2F25]/50 text-sm max-w-xs mx-auto">
                            No recent events have been recorded. Share your profile to start
                            seeing live signals.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
