import React from "react";

interface MetricCardProps {
    title: string;
    value: string;
    icon: string;
    trend: string;
    color: "blue" | "cyan" | "emerald" | "indigo" | "purple" | "amber";
}

export function MetricCard({
    title,
    value,
    icon,
    trend,
    color,
}: MetricCardProps) {
    const colorMap = {
        blue: "text-blue-600 border-blue-200 bg-blue-50",
        cyan: "text-cyan-600 border-cyan-200 bg-cyan-50",
        emerald: "text-emerald-600 border-emerald-200 bg-emerald-50",
        indigo: "text-indigo-600 border-indigo-200 bg-indigo-50",
        purple: "text-purple-600 border-purple-200 bg-purple-50",
        amber: "text-amber-600 border-amber-200 bg-amber-50",
    };

    return (
        <div className="group rounded-xl p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {title}
                </h3>
                <span
                    className={`h-10 w-10 flex items-center justify-center rounded-lg text-xl border-2 ${colorMap[color]}`}
                >
                    {icon}
                </span>
            </div>
            <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold font-serif text-slate-900">{value}</p>
                <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    {trend}
                </span>
            </div>
        </div>
    );
}

interface TierBarProps {
    label: string;
    count: number;
    total: number;
    color: string;
}

export function TierBar({
    label,
    count,
    total,
    color,
}: TierBarProps) {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600 uppercase tracking-widest">{label}</span>
                <span className="text-slate-900 font-mono">
                    {count}{" "}
                    <span className="text-slate-400 text-[10px]">
                        ({percentage.toFixed(0)}%)
                    </span>
                </span>
            </div>
            <div className="h-3 w-full bg-slate-100 border border-slate-200 rounded-sm overflow-hidden">
                <div
                    className={`h-full ${color} border-r border-black transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

interface IndustryData {
    name: string;
    count: number;
}

export function IndustryDistribution({ industries }: { industries: IndustryData[] }) {
    return (
        <div className="rounded-xl p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                    <span className="mr-2 h-2 w-2 bg-cyan-600 border border-black"></span>
                    Top Industries
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-1 rounded">
                    Volume per Market
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {industries.map((industry, index) => (
                    <div
                        key={industry.name}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border-2 border-slate-200 hover:border-black transition-colors"
                    >
                        <div className="flex items-center">
                            <span className="text-xs font-bold text-slate-400 w-6 font-mono">
                                {(index + 1).toString().padStart(2, "0")}
                            </span>
                            <span className="text-sm font-bold text-slate-900 ml-1">
                                {industry.name}
                            </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded border border-cyan-200 bg-cyan-50 text-cyan-700">
                            {industry.count}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface ActivityItem {
    description: string;
    timestamp: string | number | Date;
}

export function RecentActivity({ activities }: { activities: ActivityItem[] }) {
    return (
        <div className="rounded-xl p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                    <span className="mr-2 h-2 w-2 bg-purple-600 border border-black"></span>
                    Recent Platform Activity
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-1 rounded">
                    Live Pulse
                </span>
            </div>
            <div className="space-y-4">
                {activities.map((activity, index) => (
                    <div
                        key={index}
                        className="relative pl-6 pb-4 border-l-2 border-slate-200 last:pb-0"
                    >
                        <div className="absolute top-0 left-[-5px] h-2 w-2 bg-blue-600 border border-black"></div>
                        <p className="text-sm font-bold text-slate-900">
                            {activity.description}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 font-mono">
                            {new Date(activity.timestamp).toLocaleString(
                                undefined,
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "numeric",
                                    month: "short",
                                }
                            )}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
