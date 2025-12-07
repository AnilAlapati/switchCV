"use client";

import Link from "next/link";
import type { ActionItem } from "@/types/dashboard";

interface ActionPlanCardProps {
  headline: string;
  items: ActionItem[];
  loading?: boolean;
  emptyMessage?: string;
}

const statusStyles: Record<ActionItem["status"], string> = {
  blocked: "bg-rose-50 text-rose-600 border border-rose-100",
  notStarted: "bg-slate-50 text-slate-600 border border-slate-200",
  inProgress: "bg-amber-50 text-amber-600 border border-amber-100",
  completed: "bg-emerald-50 text-emerald-600 border border-emerald-100",
};

const priorityAccent: Record<ActionItem["priority"], string> = {
  high: "text-rose-600",
  medium: "text-amber-600",
  low: "text-blue-600",
};

export function ActionPlanCard({
  headline,
  items,
  loading,
  emptyMessage = "All caught up. Circle back tomorrow for new suggestions.",
}: ActionPlanCardProps) {
  return (
    <section className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#1A2F25]">{headline}</h2>
        <span className="text-xs font-bold uppercase tracking-wide text-[#2C4A3B]/60">
          Focus queue
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl bg-white/20"
              />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <p className="rounded-xl border border-white/50 bg-white/20 p-4 text-sm text-[#1A2F25]/60">
            {emptyMessage}
          </p>
        )}

        {!loading &&
          items.map((item) => {
            const StatusTag = (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]
                  }`}
              >
                {item.status === "blocked" && "Start here"}
                {item.status === "notStarted" && "Next step"}
                {item.status === "inProgress" && "In progress"}
                {item.status === "completed" && "Done"}
              </span>
            );

            const MetaTag = item.meta ? (
              <span className="text-xs font-medium text-slate-500">
                {item.meta}
              </span>
            ) : null;

            const CTAButton = item.cta ? (
              item.cta.href ? (
                <Link
                  href={item.cta.href}
                  target={item.cta.target}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-600 transition hover:bg-blue-100 group-hover:bg-blue-100"
                >
                  {item.cta.label}
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
                      d="M13 7h6m0 0v6m0-6L10 16"
                    />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.cta.onClick}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/30"
                >
                  {item.cta.label}
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
                      d="M13 7h6m0 0v6m0-6L10 16"
                    />
                  </svg>
                </button>
              )
            ) : null;

            return (
              <article
                key={item.id}
                className="group rounded-xl border border-white/50 bg-white/40 p-4 transition hover:border-white hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {StatusTag}
                      <span
                        className={`text-xs uppercase ${priorityAccent[item.priority]
                          }`}
                      >
                        {item.priority} priority
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#1A2F25]">
                      {item.title}
                    </h3>
                  </div>
                  {CTAButton}
                </div>
                <p className="mt-2 text-sm text-[#1A2F25]/70">
                  {item.description}
                </p>
                {MetaTag && <div className="mt-3">{MetaTag}</div>}
              </article>
            );
          })}
      </div>
    </section>
  );
}
