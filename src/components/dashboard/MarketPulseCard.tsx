"use client";

import type { ReactElement } from "react";
import { useGlobalStats } from "@/hooks/useGlobalStats";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";
import { TrendingUp, Users, Briefcase, Zap } from "lucide-react";

export function MarketPulseCard(): ReactElement {
  const { stats } = useGlobalStats();
  const { tier } = useUserProfile();
  const isBasic = tier === "basic";

  const trendingSkills = [
    { name: "React Query", trend: "+12%" },
    { name: "Next.js 14", trend: "+8%" },
    { name: "Tailwind CSS", trend: "+15%" },
    { name: "TypeScript", trend: "+5%" },
  ];

  const cardContent = (
    <div className="bg-white border-2 border-black p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6 border-b-2 border-gray-100 pb-4">
          <div className="p-2 bg-black text-white">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-serif font-bold tracking-tight text-black">
            Autonomous Market Pulse
          </h3>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-3">
              Platform Growth
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 border border-gray-200 transition-all hover:border-black">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-3 w-3 text-gray-500" />
                  <span className="text-2xl font-serif font-bold text-black">
                    {stats.jobSeekers}
                  </span>
                </div>
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wide">
                  Candidates
                </p>
              </div>
              <div className="bg-gray-50 p-4 border border-gray-200 transition-all hover:border-black">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-3 w-3 text-gray-500" />
                  <span className="text-2xl font-serif font-bold text-black">
                    {stats.recruiters}
                  </span>
                </div>
                <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wide">
                  Recruiters
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                Trending Skills
              </p>
              <TrendingUp className="h-3 w-3 text-gray-400" />
            </div>
            <div className="space-y-2">
              {trendingSkills.map((skill, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between group cursor-default"
                >
                  <span className="text-sm font-medium text-gray-700 group-hover:text-black transition-colors">
                    {skill.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 border border-blue-100">
                    {skill.trend}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t-2 border-gray-100">
          <p className="text-xs text-gray-500 font-sans">
            Based on {stats.resumes} resumes active on the platform.
          </p>
        </div>
      </div>
    </div>
  );

  if (isBasic) {
    return (
      <PremiumFeatureLock
        featureName="AI Market Trends"
        description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
        className="h-full"
      >
        {cardContent}
      </PremiumFeatureLock>
    );
  }

  return cardContent;
}
