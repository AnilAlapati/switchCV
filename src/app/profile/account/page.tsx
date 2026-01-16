"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SecuritySection } from "@/components/account/SecuritySection";
import { SubscriptionSection } from "@/components/account/SubscriptionSection";
import { PreferencesSection } from "@/components/account/PreferencesSection";
import { DangerZone } from "@/components/account/DangerZone";
import { getVerificationRoute } from "@/lib/config";

const VERIFICATION_ROUTE = getVerificationRoute();

export default function AccountPage() {
    const { user, logout, loading: authLoading, needsEmailVerification } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && (!user || needsEmailVerification)) {
            router.push(VERIFICATION_ROUTE);
        }
    }, [user, needsEmailVerification, authLoading, router]);

    const handleLogout = async () => {
        await logout();
        router.replace("/auth");
    };

    if (authLoading || !user) {
        return (
            <DashboardBackground>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                </div>
            </DashboardBackground>
        );
    }

    return (
        <DashboardBackground>
            <DashboardHeader userEmail={user.email} onLogout={handleLogout} />

            <main className="relative z-10 max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center">
                    <h1 className="text-5xl font-serif font-bold text-black tracking-tight">
                        Account Settings
                    </h1>
                    <p className="text-gray-500 text-lg mt-4 font-sans max-w-2xl mx-auto">
                        Manage security, privacy, and preferences
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <SecuritySection />
                        <SubscriptionSection />
                    </div>
                    <div className="space-y-8">
                        <PreferencesSection />
                    </div>
                </div>

                <DangerZone />

            </main>
        </DashboardBackground>
    );
}
