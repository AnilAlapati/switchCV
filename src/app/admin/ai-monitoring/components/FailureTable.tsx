"use client";

import { AIFailureEventDoc } from "@/types/aiMonitoring";

interface FailureTableProps {
    events: AIFailureEventDoc[] | undefined;
}

export function FailureTable({ events }: FailureTableProps) {
    if (!events || events.length === 0) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                <p className="text-slate-500">No recent failure events found.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Time</th>
                            <th className="px-6 py-4">Stage</th>
                            <th className="px-6 py-4">Code</th>
                            <th className="px-6 py-4">Provider / Model</th>
                            <th className="px-6 py-4">Error Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {events.map((event) => (
                            <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                                    {event.createdAt
                                        ? new Date(event.createdAt).toLocaleString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                                        {event.stage}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-red-600 font-medium">
                                        {event.failureCode}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                    {event.provider || "N/A"}
                                    {event.model && (
                                        <span className="text-slate-400 block text-xs">
                                            {event.model}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-700 max-w-sm xl:max-w-md truncate" title={event.errorMessage}>
                                        {event.errorMessage}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
