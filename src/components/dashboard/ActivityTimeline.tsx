"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Search, Zap, Star, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";

export function ActivityTimeline() {
  const { tier } = useUserProfile();
  const isBasic = tier === "basic";

  const [activities, setActivities] = useState(() => {
    // Initialize with placeholder timestamps that will be replaced
    const placeholderDate = new Date(2024, 0, 1);
    return [
      {
        id: 1,
        type: "update",
        content: "Resume updated",
        timestamp: placeholderDate,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        color: "bg-emerald-500/10",
      },
      {
        id: 2,
        type: "search",
        content: "5 recruiters searched for 'React Developer'",
        timestamp: placeholderDate,
        icon: <Search className="h-4 w-4 text-indigo-500" />,
        color: "bg-indigo-500/10",
      },
      {
        id: 3,
        type: "insight",
        content: "New interview guide available in resources",
        timestamp: placeholderDate,
        icon: <Zap className="h-4 w-4 text-yellow-500" />,
        color: "bg-yellow-500/10",
      },
      {
        id: 4,
        type: "success",
        content: "Profile visibility boosted by 15%",
        timestamp: placeholderDate,
        icon: <Star className="h-4 w-4 text-purple-500" />,
        color: "bg-purple-500/10",
      },
      {
        id: 5,
        type: "engagement",
        content: "New contact request received",
        timestamp: placeholderDate,
        icon: <MessageSquare className="h-4 w-4 text-pink-500" />,
        color: "bg-pink-500/10",
      },
    ];
  });

  useEffect(() => {
    // Set actual timestamps after component mounts
    // Use setTimeout to avoid synchronous state update warning
    const timer = setTimeout(() => {
      const now = Date.now();
      setActivities([
        {
          id: 1,
          type: "update",
          content: "Resume updated",
          timestamp: new Date(now - 1000 * 60 * 60 * 2), // 2 hours ago
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          color: "bg-emerald-500/10",
        },
        {
          id: 2,
          type: "search",
          content: "5 recruiters searched for 'React Developer'",
          timestamp: new Date(now - 1000 * 60 * 60 * 5), // 5 hours ago
          icon: <Search className="h-4 w-4 text-indigo-500" />,
          color: "bg-indigo-500/10",
        },
        {
          id: 3,
          type: "insight",
          content: "New interview guide available in resources",
          timestamp: new Date(now - 1000 * 60 * 60 * 24), // 24 hours ago
          icon: <Zap className="h-4 w-4 text-yellow-500" />,
          color: "bg-yellow-500/10",
        },
        {
          id: 4,
          type: "success",
          content: "Profile visibility boosted by 15%",
          timestamp: new Date(now - 1000 * 60 * 60 * 48), // 2 days ago
          icon: <Star className="h-4 w-4 text-purple-500" />,
          color: "bg-purple-500/10",
        },
        {
          id: 5,
          type: "engagement",
          content: "New contact request received",
          timestamp: new Date(now - 1000 * 60 * 60 * 72), // 3 days ago
          icon: <MessageSquare className="h-4 w-4 text-pink-500" />,
          color: "bg-pink-500/10",
        },
      ]);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const cardContent = (
    <div className="glass-panel rounded-3xl p-6 bg-white/40 border-white/60">
      <h3 className="text-lg font-bold text-[#1A2F25] mb-6 flex items-center gap-2">
        Recent Activity
      </h3>

      <div className="space-y-6 relative before:absolute before:inset-0 before:left-[15px] before:w-0.5 before:bg-[#1A2F25]/5 before:content-['']">
        {activities.map((activity) => (
          <div key={activity.id} className="relative flex gap-4 pl-1">
            <div
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${activity.color} border-2 border-white shadow-sm ring-4 ring-transparent transition-transform hover:scale-110`}
            >
              {activity.icon}
            </div>
            <div className="flex flex-col pt-0.5">
              <span className="text-sm font-bold text-[#1A2F25]">
                {activity.content}
              </span>
              <span className="text-[10px] font-medium text-[#1A2F25]/40 mt-0.5">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button className="w-full py-2.5 rounded-xl border border-[#1A2F25]/10 text-xs font-bold text-[#1A2F25]/60 hover:bg-[#1A2F25]/5 transition-colors">
          View All Activity
        </button>
      </div>
    </div>
  );

  if (isBasic) {
    return (
      <PremiumFeatureLock
        featureName="Recent Activity"
        description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
        className="h-full"
      >
        {cardContent}
      </PremiumFeatureLock>
    );
  }

  return cardContent;
}
