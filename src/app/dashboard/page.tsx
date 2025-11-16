// src/app/dashboard/page.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useResume } from "@/hooks/useResume";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ResumeStatusCard } from "@/components/dashboard/ResumeStatusCard";
import { ProfileViewsCard } from "@/components/dashboard/ProfileViewsCard";
import { ContactRequestsCard } from "@/components/dashboard/ContactRequestsCard";
import { ResumeQualityCard } from "@/components/dashboard/ResumeQualityCard";
import { LastUpdatedCard } from "@/components/dashboard/LastUpdatedCard";
import { DownloadsCard } from "@/components/dashboard/DownloadsCard";
import { RecruiterSearchBox } from "@/components/dashboard/RecruiterSearchBox";

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const { hasResume, resumeId, loading: resumeLoading } = useResume();
  const router = useRouter();
  const [userIsRecruiter, setUserIsRecruiter] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Fetch user recruiter status
    const fetchUserStatus = async () => {
      if (!user) return;
      try {
        const response = await fetch(`/api/user/settings?userId=${user.uid}`);
        if (response.ok) {
          const data = await response.json();
          setUserIsRecruiter(data.isRecruiter);
        }
      } catch (error) {
        console.error("Failed to fetch user status:", error);
      }
    };
    fetchUserStatus();
  }, [user]);

  if (loading) {
    return (
      <DashboardBackground>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-lg">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardBackground>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardBackground>
      <DashboardHeader userEmail={user.email} onLogout={logout} />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ResumeStatusCard
            hasResume={hasResume}
            resumeId={resumeId}
            resumeLoading={resumeLoading}
          />
          <ProfileViewsCard />
          <ContactRequestsCard />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ResumeQualityCard hasResume={hasResume} />
          <LastUpdatedCard hasResume={hasResume} />
          <DownloadsCard hasResume={hasResume} />
        </div>

        {/* Recruiter Search Section */}
        {userIsRecruiter && (
          <div className="mb-8">
            <RecruiterSearchBox />
          </div>
        )}
      </main>
    </DashboardBackground>
  );
}
