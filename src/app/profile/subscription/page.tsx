"use client";

import { useTier } from "@/hooks/useTier";
import { useTierLimits } from "@/hooks/useTierLimits";
import { SubscriptionTier } from "@/lib/config";

// ...existing code...
function SparklesIcon({ className }: { className?: string }) {
  // ...existing code...
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
  const { tier, loading: tierLoading } = useTier();
  const { limits, loading: limitsLoading, error } = useTierLimits();

  const loading = tierLoading || limitsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-b-2 border-cyan-500 animate-spin"></div>
          <div className="absolute inset-0 h-16 w-16 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin-reverse opacity-50"></div>
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
        `${
          limits.basic.resumeRetentionDays || "Forever"
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
    <div className="min-h-screen bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[50%] w-[50%] rounded-full bg-cyan-500/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] h-[40%] w-[40%] rounded-full bg-purple-600/5 blur-[100px]" />
        <div className="absolute bottom-0 left-[20%] h-[30%] w-[60%] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Beta Banner - Cyberpunk Style */}
        <div className="mb-16 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center gap-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-lg shadow-2xl">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-600/20 flex items-center justify-center border border-white/10">
                <SparklesIcon className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Beta Access Active
              </h3>
              <p className="text-sm text-slate-400">
                Subscription management is currently in beta. Payment gateways
                are disabled for testing purposes.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mb-20">
          <h2 className="text-cyan-400 font-semibold tracking-wide uppercase text-sm mb-3">
            Upgrade Your Potential
          </h2>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Choose your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              Power Level
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-400">
            Unlock advanced AI capabilities, unlimited searches, and premium
            features designed to accelerate your career or hiring pipeline.
          </p>
        </div>

        {/* Pricing Cards - HUD Interface Style */}
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-x-8 items-stretch">
          {tiers.map((plan) => {
            const isCurrent = tier === plan.id;
            const isHighlight = plan.highlight;

            return (
              <div
                key={plan.id}
                className={`relative group flex flex-col h-full transition-all duration-500 ${
                  isCurrent ? "scale-105 z-10" : "hover:scale-105 z-0"
                }`}
              >
                {/* HUD Border Frame */}
                <div
                  className={`absolute inset-0 border-2 pointer-events-none transition-colors duration-300 ${
                    isCurrent
                      ? "border-cyan-500/50"
                      : isHighlight
                      ? "border-purple-500/30 group-hover:border-purple-500/60"
                      : "border-slate-800 group-hover:border-slate-600"
                  }`}
                >
                  {/* Corner Markers */}
                  <div
                    className={`absolute -top-1 -left-1 w-2 h-2 bg-slate-950 border-t-2 border-l-2 ${
                      isCurrent ? "border-cyan-400" : "border-slate-500"
                    }`}
                  />
                  <div
                    className={`absolute -top-1 -right-1 w-2 h-2 bg-slate-950 border-t-2 border-r-2 ${
                      isCurrent ? "border-cyan-400" : "border-slate-500"
                    }`}
                  />
                  <div
                    className={`absolute -bottom-1 -left-1 w-2 h-2 bg-slate-950 border-b-2 border-l-2 ${
                      isCurrent ? "border-cyan-400" : "border-slate-500"
                    }`}
                  />
                  <div
                    className={`absolute -bottom-1 -right-1 w-2 h-2 bg-slate-950 border-b-2 border-r-2 ${
                      isCurrent ? "border-cyan-400" : "border-slate-500"
                    }`}
                  />
                </div>

                {/* Card Content */}
                <div
                  className={`flex-1 flex flex-col p-8 bg-slate-900/80 backdrop-blur-md h-full ${
                    isCurrent ? "bg-slate-900/90" : ""
                  }`}
                >
                  {/* Header Section */}
                  <div className="mb-8 border-b border-slate-800 pb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3
                        className={`font-mono text-sm uppercase tracking-[0.2em] ${
                          isCurrent ? "text-cyan-400" : "text-slate-400"
                        }`}
                      >
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <span className="animate-pulse w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"></span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white font-mono">
                        {plan.price}
                      </span>
                      {plan.price !== "Free" && plan.price !== "Custom" && (
                        <span className="text-slate-600 font-mono text-xs">
                          /MO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-400 text-sm mb-8 font-light leading-relaxed min-h-[40px]">
                    {plan.description}
                  </p>

                  {/* Tech Specs List */}
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 group/item"
                      >
                        <span
                          className={`mt-1.5 w-1 h-1 rounded-none ${
                            isCurrent
                              ? "bg-cyan-500"
                              : "bg-slate-600 group-hover/item:bg-purple-500"
                          } transition-colors`}
                        />
                        <span className="text-sm text-slate-300 font-mono text-xs tracking-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <button
                    disabled={true}
                    className={`w-full py-3 px-4 text-xs font-mono uppercase tracking-widest transition-all duration-300 border ${
                      isCurrent
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)]"
                        : "bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {isCurrent ? ">> SYSTEM ACTIVE <<" : ">> INITIALIZING..."}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Additional Info Section */}
        <div className="mt-24 border-t border-white/5 pt-16">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Enterprise Solutions
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Need more power? Our enterprise infrastructure is built to
                handle millions of vector searches with sub-second latency.
                Contact our sales team for custom SLA agreements and dedicated
                support channels.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Secure & Private
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We prioritize data privacy. Your resume data is encrypted at
                rest and in transit. We never share your personal contact
                information without your explicit consent for each request.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
