"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "next/navigation";
import { getVerificationRoute } from "@/lib/config";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { RecruiterSearchBox } from "@/components/dashboard/RecruiterSearchBox";

const VERIFICATION_ROUTE = getVerificationRoute();

export default function RecruiterSearchPage() {
  const { user, loading: authLoading, needsEmailVerification } = useAuth();
  const { role, loading: profileLoading } = useUserProfile();
  const router = useRouter();

  const loading = authLoading || profileLoading;

  useEffect(() => {
    if (!loading) {
      if (!user || needsEmailVerification) {
        router.replace(VERIFICATION_ROUTE);
      } else if (!role) {
        router.replace("/select-role");
      } else if (role !== "recruiter" && role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [loading, user, needsEmailVerification, role, router]);

  if (loading) {
    return (
      <DashboardBackground>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          <p className="text-slate-900 font-medium relative z-10">
            Preparing search command center…
          </p>
        </div>
      </DashboardBackground>
    );
  }

  if (!user || needsEmailVerification) {
    return (
      <DashboardBackground>
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          <p className="text-slate-900 font-medium relative z-10">
            Redirecting to sign in…
          </p>
        </div>
      </DashboardBackground>
    );
  }

  return (
    <DashboardBackground>
      <div className="min-h-screen text-slate-900 relative">
        <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-serif text-slate-900 mb-2">
              Talent Search
            </h1>
            <p className="text-gray-500 font-sans max-w-2xl">
              Describe your ideal candidate in natural language, or use basic lookup and premium filters
              to find the perfect match for your requirements.
            </p>
          </div>

          <section>
            <RecruiterSearchBox />
          </section>
        </div>
      </div>
    </DashboardBackground>
  );
}
