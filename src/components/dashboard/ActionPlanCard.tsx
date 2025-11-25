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
  blocked: "bg-rose-500/20 text-rose-200 border border-rose-500/40",
  notStarted: "bg-slate-800/70 text-slate-200 border border-slate-700/70",
  inProgress: "bg-amber-500/20 text-amber-200 border border-amber-500/40",
  completed: "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40",
};

const priorityAccent: Record<ActionItem["priority"], string> = {
  high: "text-rose-200",
  medium: "text-amber-200",
  low: "text-cyan-200",
};

export function ActionPlanCard({
  headline,
  items,
  loading,
  emptyMessage = "All caught up. Circle back tomorrow for new suggestions.",
}: ActionPlanCardProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{headline}</h2>
        <span className="text-xs uppercase tracking-wide text-slate-400">
          Focus queue
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-xl bg-slate-800/70"
              />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            {emptyMessage}
          </p>
        )}

        {!loading &&
          items.map((item) => {
            const StatusTag = (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  statusStyles[item.status]
                }`}
              >
                {item.status === "blocked" && "Start here"}
                {item.status === "notStarted" && "Next step"}
                {item.status === "inProgress" && "In progress"}
                {item.status === "completed" && "Done"}
              </span>
            );

            const MetaTag = item.meta ? (
              <span className="text-xs font-medium text-slate-400">
                {item.meta}
              </span>
            ) : null;

            const CTAButton = item.cta ? (
              item.cta.href ? (
                <Link
                  href={item.cta.href}
                  target={item.cta.target}
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
                className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-900/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {StatusTag}
                      <span
                        className={`text-xs uppercase ${
                          priorityAccent[item.priority]
                        }`}
                      >
                        {item.priority} priority
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {item.title}
                    </h3>
                  </div>
                  {CTAButton}
                </div>
                <p className="mt-2 text-sm text-slate-300">
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
