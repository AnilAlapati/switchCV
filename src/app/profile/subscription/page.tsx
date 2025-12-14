"use client";

import { useTier } from "@/hooks/useTier";
import { useTierLimits } from "@/hooks/useTierLimits";
import { SubscriptionTier } from "@/lib/config";
import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

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
  const { tier, loading: tierLoading } = useTier();
  const { limits, loading: limitsLoading } = useTierLimits();

  const loading = tierLoading || limitsLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BackgroundBlobs />
        <div className="relative z-10">
          <div className="h-16 w-16 rounded-full border-t-2 border-b-2 border-[#2C4A3B] animate-spin"></div>
        </div>
      </div>
    );
  }

  const tiers: {
    id: SubscriptionTier;
    name: string;
    price: string;
    description: string;
    features: string[];
    highlight?: boolean;
  }[] = [
      {
        id: "basic",
        name: "Basic",
        price: "Free",
        description: "Essential features for job seekers starting their journey.",
        features: [
          `${limits.basic.resumeCreationLimit} Resume Creation`,
          limits.basic.resumeEditingAllowed
            ? "Resume Editing"
            : "No Resume Editing",
          `${limits.basic.resumeRetentionDays || "Forever"
          } Days Resume Retention`,
          `${limits.basic.recruiterSearchLimit} AI Searches (Recruiter)`,
          `${limits.basic.recruiterContactLimit.amount} Contact Requests (${limits.basic.recruiterContactLimit.interval})`,
        ],
      },
      {
        id: "premium",
        name: "Premium",
        price: "",
        description: "Advanced AI tools for serious candidates and recruiters.",
        highlight: true,
        features: [
          `${limits.premium.resumeCreationLimit} Resume Creations`,
          limits.premium.resumeEditingAllowed
            ? "Unlimited Resume Editing"
            : "No Resume Editing",
          "Forever Resume Retention",
          `${limits.premium.recruiterSearchLimit} AI Searches (Recruiter)`,
          `${limits.premium.recruiterContactLimit.amount} Contact Requests (${limits.premium.recruiterContactLimit.interval})`,
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "Custom",
        description: "Complete solution for high-volume recruitment agencies.",
        features: [
          "Unlimited Resume Creations",
          "Unlimited Resume Editing",
          "Forever Resume Retention",
          "Unlimited AI Searches",
          "Unlimited Contact Requests",
        ],
      },
    ];

  return (
    <DashboardBackground>
      <DashboardHeader
        userEmail={user?.email}
        onLogout={async () => {
          await logout();
          router.push("/auth");
        }}
      />
      <div className="min-h-screen relative overflow-hidden text-[#1A2F25]">
        {/* Aura Background - Removed as it is in DashboardBackground now */}

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          {/* Beta Banner */}
          <div className="mb-16 relative">
            <div className="relative flex items-center gap-4 glass-panel p-4 rounded-xl shadow-lg">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-[#2C4A3B]/10 flex items-center justify-center border border-[#2C4A3B]/10">
                  <SparklesIcon className="h-5 w-5 text-[#2C4A3B]" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2F25]">
                  Beta Access Active
                </h3>
                <p className="text-sm text-[#2C4A3B]/70">
                  Subscription management is currently in beta. Payment gateways
                  are disabled for testing purposes.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mb-20">
            <h2 className="text-[#2C4A3B] font-bold tracking-wide uppercase text-sm mb-3">
              Upgrade Your Potential
            </h2>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1A2F25] tracking-tight mb-6">
              Choose your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2C4A3B] to-emerald-600">
                Power Level
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-[#1A2F25]/70">
              Unlock advanced AI capabilities, unlimited searches, and premium
              features designed to accelerate your career or hiring pipeline.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-x-8 items-stretch bg-transparent">
            {tiers.map((plan) => {
              const isCurrent = tier === plan.id;
              // const isHighlight = plan.highlight;

              return (
                <div
                  key={plan.id}
                  className={`relative group flex flex-col h-full transition-all duration-500 rounded-3xl ${isCurrent ? "scale-105 z-10 shadow-2xl" : "hover:scale-105 z-0 hover:shadow-xl"
                    }`}
                >
                  {/* Card Boarder/Background */}
                  <div
                    className={`absolute inset-0 rounded-3xl border transition-colors duration-300 ${isCurrent
                      ? "border-[#2C4A3B]/40 bg-white/60 backdrop-blur-xl"
                      : "border-white/50 bg-white/40 backdrop-blur-md"
                      }`}
                  />

                  {/* Card Content */}
                  <div className="relative z-10 flex-1 flex flex-col p-8 h-full">
                    {/* Header Section */}
                    <div className="mb-8 border-b border-[#2C4A3B]/10 pb-6">
                      <div className="flex justify-between items-center mb-2">
                        <h3
                          className={`font-bold text-sm uppercase tracking-[0.2em] ${isCurrent ? "text-[#2C4A3B]" : "text-[#1A2F25]/60"
                            }`}
                        >
                          {plan.name}
                        </h3>
                        {isCurrent && (
                          <span className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-[#1A2F25]">
                          {plan.price}
                        </span>
                        {plan.price !== "Free" && plan.price !== "Custom" && (
                          <span className="text-[#2C4A3B]/60 font-medium text-xs">
                            /MO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-[#1A2F25]/70 text-sm mb-8 leading-relaxed min-h-[40px]">
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
                            className={`mt-1.5 w-1.5 h-1.5 rounded-full ${isCurrent
                              ? "bg-emerald-500"
                              : "bg-[#2C4A3B]/40 group-hover/item:bg-[#2C4A3B]"
                              } transition-colors`}
                          />
                          <span className="text-sm text-[#1A2F25]/80 font-medium tracking-tight">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <button
                      disabled={true}
                      className={`w-full py-3 px-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-xl border ${isCurrent
                        ? "bg-[#2C4A3B]/10 border-[#2C4A3B] text-[#2C4A3B]"
                        : "bg-transparent border-[#2C4A3B]/20 text-[#2C4A3B]/60"
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
          <div className="mt-24 border-t border-[#2C4A3B]/10 pt-16">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-lg font-bold text-[#1A2F25] mb-4">
                  Enterprise Solutions
                </h3>
                <p className="text-[#1A2F25]/70 text-sm leading-relaxed">
                  Need more power? Our enterprise infrastructure is built to
                  handle millions of vector searches with sub-second latency.
                  Contact our sales team for custom SLA agreements and dedicated
                  support channels.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1A2F25] mb-4">
                  Secure & Private
                </h3>
                <p className="text-[#1A2F25]/70 text-sm leading-relaxed">
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
