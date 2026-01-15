"use client";

import type { ReactElement } from "react";
import { useState, useEffect } from "react";
import { CheckCircle2, Search, Zap, Star, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";

export function ActivityTimeline(): ReactElement {
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
        icon: <CheckCircle2 className="h-4 w-4 text-black" />,
        color: "bg-gray-100",
      },
      {
        id: 2,
        type: "search",
        content: "5 recruiters searched for 'React Developer'",
        timestamp: placeholderDate,
        icon: <Search className="h-4 w-4 text-blue-600" />,
        color: "bg-blue-50",
      },
      {
        id: 3,
        type: "insight",
        content: "New interview guide available in resources",
        timestamp: placeholderDate,
        icon: <Zap className="h-4 w-4 text-gray-600" />,
        color: "bg-gray-50",
      },
      {
        id: 4,
        type: "success",
        content: "Profile visibility boosted by 15%",
        timestamp: placeholderDate,
        icon: <Star className="h-4 w-4 text-blue-600" />,
        color: "bg-blue-50",
      },
      {
        id: 5,
        type: "engagement",
        content: "New contact request received",
        timestamp: placeholderDate,
        icon: <MessageSquare className="h-4 w-4 text-black" />,
        color: "bg-gray-100",
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
          icon: <CheckCircle2 className="h-4 w-4 text-black" />,
          color: "bg-gray-100",
        },
        {
          id: 2,
          type: "search",
          content: "5 recruiters searched for 'React Developer'",
          timestamp: new Date(now - 1000 * 60 * 60 * 5), // 5 hours ago
          icon: <Search className="h-4 w-4 text-blue-600" />,
          color: "bg-blue-50",
        },
        {
          id: 3,
          type: "insight",
          content: "New interview guide available in resources",
          timestamp: new Date(now - 1000 * 60 * 60 * 24), // 24 hours ago
          icon: <Zap className="h-4 w-4 text-gray-600" />,
          color: "bg-gray-50",
        },
        {
          id: 4,
          type: "success",
          content: "Profile visibility boosted by 15%",
          timestamp: new Date(now - 1000 * 60 * 60 * 48), // 2 days ago
          icon: <Star className="h-4 w-4 text-blue-600" />,
          color: "bg-blue-50",
        },
        {
          id: 5,
          type: "engagement",
          content: "New contact request received",
          timestamp: new Date(now - 1000 * 60 * 60 * 72), // 3 days ago
          icon: <MessageSquare className="h-4 w-4 text-black" />,
          color: "bg-gray-100",
        },
      ]);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const cardContent = (
    <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="text-lg font-serif font-bold text-black mb-6 flex items-center gap-2 border-b-2 border-gray-100 pb-4">
        Recent Activity
      </h3>

      <div className="space-y-6 relative before:absolute before:inset-0 before:left-[15px] before:w-0.5 before:bg-gray-200 before:content-['']">
        {activities.map((activity) => (
          <div key={activity.id} className="relative flex gap-4 pl-1">
            <div
              className={`relative z-10 flex h-8 w-8 items-center justify-center ${activity.color} border-2 border-gray-200 transition-transform hover:scale-110 hover:border-black`}
            >
              {activity.icon}
            </div>
            <div className="flex flex-col pt-0.5">
              <span className="text-sm font-bold text-black">
                {activity.content}
              </span>
              <span className="text-[10px] font-mono text-gray-400 mt-0.5 uppercase tracking-wider">
                {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button className="w-full py-3 border-2 border-black text-xs font-bold text-black uppercase tracking-widest hover:bg-black hover:text-white transition-colors">
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
