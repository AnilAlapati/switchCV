"use client";

import React from "react";

export function AdminDashboardSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="h-10 w-64 bg-slate-200 rounded animate-pulse"></div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse">
                        <div className="h-4 w-32 bg-slate-200 rounded mb-4"></div>
                        <div className="h-10 w-24 bg-slate-200 rounded mb-4"></div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                                <div className="h-4 w-12 bg-slate-200 rounded"></div>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
