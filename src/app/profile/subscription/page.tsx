"use client";

import { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useTierLimits } from "@/hooks/useTierLimits";
import { usePricing } from "@/hooks/usePricing";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { WillingnessToPaySurvey } from "@/components/subscription/WillingnessToPaySurvey";
import { SubscriptionSkeleton } from "@/components/subscription/SubscriptionSkeleton";

import {
  BetaBanner,
  RoleSwitcher,
  PlanCard
} from "@/components/subscription/SubscriptionComponents";

export default function SubscriptionPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const {
    jobSeekerTier,
    recruiterTier,
    role: currentRole,
    loading: profileLoading,
  } = useUserProfile();
  const { limits, loading: limitsLoading } = useTierLimits();
  const jobseekerPricing = usePricing("jobseeker");
  const recruiterPricing = usePricing("recruiter");

  // Default to current role view, fallback to jobseeker
  const [viewRole, setViewRole] = useState<"jobseeker" | "recruiter">(
    currentRole === "recruiter" ? "recruiter" : "jobseeker",
  );

  const loading = profileLoading || limitsLoading;

  if (loading) {
    return (
      <DashboardBackground>
        <DashboardHeader userEmail={user?.email} onLogout={() => { }} />
        <SubscriptionSkeleton />
      </DashboardBackground>
    );
  }

  const getTiersForRole = (role: "jobseeker" | "recruiter") => {
    const pricing = role === "recruiter" ? recruiterPricing : jobseekerPricing;

    if (role === "recruiter") {
      return [
        {
          id: "basic",
          name: "Recruiter Basic",
          price: pricing.basic.displayText,
          description: "Essential tools for finding talent.",
          features: [
            `${limits.basic.recruiterSearchLimit} AI Searches / month`,
            `${limits.basic.recruiterContactLimit.amount} Contact Requests (${limits.basic.recruiterContactLimit.interval === "lifetime" ? "total" : "per month"})`,
            "Basic profile insights",
            "Resume viewing (Basic)",
          ],
        },
        {
          id: "premium",
          name: "Recruiter Premium",
          price: pricing.premium.displayText,
          description: "High-volume recruitment with priority outreach.",
          highlight: true,
          features: [
            `${limits.premium.recruiterSearchLimit === 9999 ? "Unlimited" : limits.premium.recruiterSearchLimit} AI Searches`,
            `${limits.premium.recruiterContactLimit.amount} Contact Requests / month`,
            "Advanced fit scoring",
            "Priority talent alerts",
            "Export candidate data",
          ],
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: pricing.enterprise.displayText,
          description: "Complete agency solution with custom scaling.",
          features: [
            "Unlimited Searches & Contacts",
            "Team collaboration seats",
            "API Access for ATS integration",
            "Custom branding",
            "Dedicated account manager",
          ],
        },
      ];
    }

    return [
      {
        id: "basic",
        name: "Standard",
        price: pricing.basic.displayText,
        description: "Everything you need to get noticed.",
        features: [
          `${limits.basic.resumeCreationLimit} Active Resume`,
          "AI Enhancement (Basic)",
          `${limits.basic.resumeRetentionDays} Days Data Retention`,
          "Basic Skill Analysis",
        ],
      },
      {
        id: "premium",
        name: "Premium Job Seeker",
        price: pricing.premium.displayText,
        description: "Dominate the market with AI-powered career growth.",
        highlight: true,
        features: [
          `${limits.premium.resumeCreationLimit === 9999 ? "Unlimited" : limits.premium.resumeCreationLimit} Resumes`,
          "Unlimited AI Fine-tuning",
          "Forever Data Retention",
          "Priority AI Agent access",
          "Advanced Interview Prep",
        ],
      },
      {
        id: "enterprise",
        name: "Career Mastery",
        price: pricing.enterprise.displayText,
        description: "Total career orchestration and exclusive networks.",
        features: [
          "Personalized Agent Orchestrator",
          "Exclusive Recruiter Network access",
          "Shadowing & Mentorship AI",
          "Unlimited Everything",
          "Direct Resume Promotion",
        ],
      },
    ];
  };

  const currentTiers = getTiersForRole(viewRole);
  const currentRoleTier =
    viewRole === "recruiter" ? recruiterTier : jobSeekerTier;

  return (
    <DashboardBackground>
      <DashboardHeader
        userEmail={user?.email}
        onLogout={async () => {
          await logout();
          router.push("/auth");
        }}
      />
      <div className="min-h-screen relative overflow-hidden text-[black]">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <BetaBanner />
          <WillingnessToPaySurvey />

          <div className="text-center mb-12">
            <h2 className="text-[black] font-bold tracking-wide uppercase text-sm mb-3">
              Upgrade Your Potential
            </h2>
            <h1 className="text-4xl md:text-5xl font-bold text-[black] tracking-tight mb-8">
              Choose your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Power Level
              </span>
            </h1>

            <RoleSwitcher viewRole={viewRole} onSwitch={setViewRole} />

            <p className="max-w-2xl mx-auto text-lg text-[black]/70">
              {viewRole === "jobseeker"
                ? "Accelerate your career with AI-powered resume fine-tuning and priority agent access."
                : "Source top talent faster with proprietary AI search and high-volume contact outreach."}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:gap-x-8 items-stretch bg-transparent">
            {currentTiers.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={currentRoleTier === plan.id}
              />
            ))}
          </div>

          <div className="mt-24 border-t border-[black]/10 pt-16">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-lg font-bold text-[black] mb-4">
                  Enterprise Solutions
                </h3>
                <p className="text-[black]/70 text-sm leading-relaxed">
                  Need more power? Our enterprise infrastructure is built to
                  handle millions of vector searches with sub-second latency.
                  Contact our sales team for custom SLA agreements and dedicated
                  support channels.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[black] mb-4">
                  Secure & Private
                </h3>
                <p className="text-[black]/70 text-sm leading-relaxed">
                  We prioritize data privacy. Your resume data is encrypted at
                  rest and in transit. We never share your personal contact
                  information without your explicit consent for each request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardBackground>
  );
}



