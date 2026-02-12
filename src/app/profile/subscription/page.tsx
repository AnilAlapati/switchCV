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

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576l.813-2.846A.75.75 0 019 4.5zM9 15a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 019 15z"
        clipRule="evenodd"
      />
    </svg>
  );
}

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
        <DashboardHeader userEmail={user?.email} onLogout={() => {}} />
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
        {/* Aura Background - Removed as it is in DashboardBackground now */}

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          {/* Beta Banner */}
          <div className="mb-16 relative">
            <div className="relative flex items-center gap-4 glass-panel p-4 rounded-xl shadow-lg">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-[black]/10 flex items-center justify-center border border-[black]/10">
                  <SparklesIcon className="h-5 w-5 text-[black]" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[black]">
                  Beta Access Active
                </h3>
                <p className="text-sm text-[black]/70">
                  Subscription management is currently in beta. Payment gateways
                  are disabled for testing purposes.
                </p>
              </div>
            </div>
          </div>

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

            {/* Role Switcher Tabs */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
                <button
                  onClick={() => setViewRole("jobseeker")}
                  className={`px-8 py-3 text-sm font-bold transition-all duration-300 rounded-lg ${
                    viewRole === "jobseeker"
                      ? "bg-white text-black shadow-md border border-gray-100"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  For Job Seekers
                </button>
                <button
                  onClick={() => setViewRole("recruiter")}
                  className={`px-8 py-3 text-sm font-bold transition-all duration-300 rounded-lg ${
                    viewRole === "recruiter"
                      ? "bg-white text-black shadow-md border border-gray-100 shadow-indigo-500/5 style={{ boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.05)' }}"
                      : "text-gray-500 hover:text-black"
                  }`}
                >
                  For Recruiters
                </button>
              </div>
            </div>

            <p className="max-w-2xl mx-auto text-lg text-[black]/70">
              {viewRole === "jobseeker"
                ? "Accelerate your career with AI-powered resume fine-tuning and priority agent access."
                : "Source top talent faster with proprietary AI search and high-volume contact outreach."}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-x-8 items-stretch bg-transparent">
            {currentTiers.map((plan) => {
              const isCurrent = currentRoleTier === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative group flex flex-col h-full transition-all duration-500 rounded-xl ${
                    isCurrent
                      ? "scale-105 z-10 shadow-2xl"
                      : "hover:scale-105 z-0 hover:shadow-xl"
                  }`}
                >
                  {/* Card Boarder/Background */}
                  <div
                    className={`absolute inset-0 rounded-xl border-2 transition-colors duration-300 ${
                      isCurrent
                        ? "border-black bg-white"
                        : "border-gray-200 bg-white group-hover:border-black/50"
                    }`}
                  />

                  {/* Card Content */}
                  <div className="relative z-10 flex-1 flex flex-col p-8 h-full">
                    {/* Header Section */}
                    <div className="mb-8 border-b-2 border-gray-100 pb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3
                          className={`font-serif font-bold text-base uppercase tracking-widest ${
                            isCurrent ? "text-black" : "text-gray-500"
                          }`}
                        >
                          {plan.name}
                        </h3>
                        {isCurrent && (
                          <span className="flex items-center gap-2 px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-serif font-bold text-black">
                          {plan.price}
                        </span>
                        {plan.price !== "Free" && plan.price !== "Custom" && (
                          <span className="text-gray-400 font-mono text-xs font-bold">
                            /MO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-8 leading-relaxed min-h-[40px] font-sans">
                      {plan.description}
                    </p>

                    {/* Features List */}
                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 group/item"
                        >
                          <span
                            className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              isCurrent
                                ? "bg-blue-600"
                                : "bg-gray-300 group-hover/item:bg-black"
                            } transition-colors`}
                          />
                          <span className="text-sm text-gray-700 font-medium tracking-tight group-hover/item:text-black transition-colors">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <button
                      disabled={true}
                      className={`w-full py-4 px-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-lg border-2 ${
                        isCurrent
                          ? "bg-black border-black text-white"
                          : "bg-transparent border-gray-200 text-gray-400"
                      }`}
                    >
                      {isCurrent ? "Active Plan" : "Select Plan"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ / Additional Info Section */}
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
