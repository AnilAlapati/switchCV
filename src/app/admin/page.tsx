"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { role, loading: profileLoading } = useUserProfile();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [error, setError] = useState("");

    const loading = authLoading || profileLoading;

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/auth?mode=signin");
            } else if (role !== "admin") {
                router.push("/dashboard");
            }
        }
    }, [user, role, loading, router]);

    useEffect(() => {
        if (user && role === "admin") {
            fetch("/api/admin/stats")
                .then(async (res) => {
                    if (!res.ok) throw new Error("Unauthorized or Failed");
                    return res.json();
                })
                .then(setStats)
                .catch((err) => setError(err.message));
        }
    }, [user, role]);

    if (loading) return <div className="p-8">Loading...</div>;
    if (!user || role !== "admin") return null;

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                        {error}
                    </div>
                )}

                {stats && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Agentic Cost Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Agentic Spend
                            </h2>
                            <div className="text-3xl font-bold text-slate-900">
                                ${stats.totalCost.toFixed(4)}
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-sm text-slate-600">
                                    <span>Budget Cap: ${stats.budgetCap}</span>
                                    <span>{stats.usagePercent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${stats.usagePercent > 90
                                            ? "bg-red-500"
                                            : stats.usagePercent > 75
                                                ? "bg-amber-500"
                                                : "bg-emerald-500"
                                            }`}
                                        style={{ width: `${Math.min(100, stats.usagePercent)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
