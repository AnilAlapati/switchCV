"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { Tooltip } from "@/components/ui/Tooltip";
import { PremiumFeatureLock } from "@/components/ui/PremiumFeatureLock";
import { useUserProfile } from "@/hooks/useUserProfile";
import { TIER_RESTRICTION_MESSAGES } from "@/lib/utils/tier-restrictions";
import type { ActionItem } from "@/types/dashboard";

interface PriorityActionsCardProps {
  headline: string;
  items: ActionItem[];
  loading?: boolean;
  emptyMessage?: string;
}

const statusStyles: Record<ActionItem["status"], string> = {
  blocked: "bg-red-50 text-red-700 border border-red-200",
  notStarted: "bg-gray-50 text-gray-600 border border-gray-200",
  inProgress: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-gray-100 text-black border border-black",
};

const priorityAccent: Record<ActionItem["priority"], string> = {
  high: "text-red-600",
  medium: "text-blue-600",
  low: "text-gray-500",
};

export function PriorityActionsCard({
  headline,
  items,
  loading,
  emptyMessage = "Your agent has no urgent suggestions. Circle back tomorrow for a fresh analysis.",
}: PriorityActionsCardProps): ReactElement {
  const { tier } = useUserProfile();
  const isBasic = tier === "basic";

  const cardContent = (
    <section className="glass-panel rounded-3xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2 className="text-xl font-bold text-[black] flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </span>
          {headline}
        </h2>
        {items.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
            {items.length} Pending
          </span>
        )}
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-2xl bg-slate-800/50"
              />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center p-6 rounded-2xl border border-dashed border-[black]/10 bg-[black]/5">
            <svg
              className="h-12 w-12 text-[black]/40 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-[black]/60">{emptyMessage}</p>
          </div>
        )}

        {!loading &&
          items.map((item) => {
            const StatusTag = (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusStyles[item.status]
                  }`}
              >
                {item.status === "blocked" && "Blocked"}
                {item.status === "notStarted" && "To Do"}
                {item.status === "inProgress" && "In Progress"}
                {item.status === "completed" && "Done"}
              </span>
            );

            const CTAButton = item.cta ? (
              item.cta.disabled ? (
                <Tooltip
                  content={item.cta.tooltip || "Feature unavailable"}
                  position="left"
                >
                  <button
                    disabled
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 p-2 text-xs font-bold text-slate-400 cursor-not-allowed border border-slate-200"
                  >
                    <span className="hidden sm:inline">{item.cta.label}</span>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                </Tooltip>
              ) : item.cta.href ? (
                <Link
                  href={item.cta.href}
                  target={item.cta.target}
                  className="inline-flex items-center gap-1.5 bg-black p-2 text-xs font-bold text-white transition hover:bg-gray-800 border-2 border-black"
                >
                  <span className="hidden sm:inline">{item.cta.label}</span>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.cta.onClick}
                  className="inline-flex items-center gap-1.5 bg-black p-2 text-xs font-bold text-white transition hover:bg-gray-800 border-2 border-black"
                >
                  <span className="hidden sm:inline">{item.cta.label}</span>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              )
            ) : null;

            return (
              <article
                key={item.id}
                className="group relative rounded-2xl border border-white/60 bg-white/40 p-4 transition-all hover:bg-white/60 hover:border-white hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${priorityAccent[
                      item.priority
                    ].replace("text-", "bg-")}`}
                  ></div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {StatusTag}
                      <span className="text-[10px] text-[black]/50 font-mono">
                        {item.priority.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[black] mb-1 pr-8">
                      {item.title}
                    </h3>

                    <p className="text-sm text-[black]/70 line-clamp-2 mb-3">
                      {item.description}
                    </p>

                    {item.meta && (
                      <div className="flex items-center text-xs text-[black]/60">
                        <span className="mr-1.5">●</span>
                        {item.meta}
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute top-4 right-4">{CTAButton}</div>
              </article>
            );
          })}
      </div>
    </section>
  );

  if (isBasic) {
    return (
      <PremiumFeatureLock
        featureName="Growth Path"
        description={TIER_RESTRICTION_MESSAGES.PRIORITY_ACTIONS}
        className="h-full"
      >
        {cardContent}
      </PremiumFeatureLock>
    );
  }

  return cardContent;
}
