"use client";

import { useState } from "react";

interface ResumeProgressProps {
  progress: number;
  collectedFields?: string[];
  missingFields?: string[];
  className?: string;
}

export function ResumeProgress({
  progress,
  collectedFields = [],
  missingFields = [],
  className,
}: ResumeProgressProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  if (clampedProgress === 0) return null;

  const indicatorPosition = Math.min(98, Math.max(2, clampedProgress));
  const showCollectedFields = collectedFields.length > 0;
  const showMissingFields =
    missingFields.length > 0 && missingFields.length <= 5;

  const containerClassName = [
    "group relative overflow-hidden rounded-2xl border border-primary/20 bg-card/80 backdrop-blur-xl text-foreground shadow-lg transition-all duration-500",
    isMinimized
      ? "w-16 h-16 p-0 hover:scale-110 cursor-pointer rounded-full"
      : "w-full lg:w-52 p-4 hover:-translate-y-1 hover:shadow-xl",
    className,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={containerClassName}
        aria-label="Expand resume progress"
        title="Click to expand"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="h-full w-full -rotate-90 transform p-1">
            <circle
              cx="50%"
              cy="50%"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-muted/20"
            />
            <circle
              cx="50%"
              cy="50%"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - clampedProgress / 100)}
              className="text-primary transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-primary">
            {clampedProgress}%
          </span>
        </div>
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-md" />
      </button>
    );
  }

  return (
    <section
      className={containerClassName}
      aria-label="Resume progress overview"
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <button
        onClick={() => setIsMinimized(true)}
        className="absolute top-2 right-2 z-20 rounded-full p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
        aria-label="Minimize"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-16 -right-8 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-6 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Resume Progress
            </p>
            <p className="text-lg font-semibold text-foreground">
              You're on track—keep going!
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-primary drop-shadow-sm">
              {clampedProgress}
              <span className="ml-1 text-base align-top text-primary/70">
                %
              </span>
            </p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Complete
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-teal-500 shadow-lg transition-[width] duration-500 ease-out"
              style={{ width: `${clampedProgress}%` }}
            >
              <div className="absolute inset-0 opacity-30 mix-blend-screen">
                <div className="h-full w-full bg-[radial-gradient(circle,_rgba(255,255,255,0.5)_0%,_rgba(255,255,255,0)_70%)]" />
              </div>
            </div>
            <div
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-primary/50 bg-white shadow-lg transition-all duration-500"
              style={{ left: `calc(${indicatorPosition}% - 10px)` }}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span>Start</span>
            <span>Finish</span>
          </div>
        </div>

        {/* Collected fields */}
        {showCollectedFields && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              ✓ Collected:
            </p>
            <div className="flex flex-wrap gap-2">
              {collectedFields.map((field) => (
                <span
                  key={field}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-100/50 px-2 py-1 text-xs text-emerald-700"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing fields */}
        {showMissingFields && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              ⏳ Still need:
            </p>
            <div className="flex flex-wrap gap-2">
              {missingFields.slice(0, 5).map((field) => (
                <span
                  key={field}
                  className="rounded-lg border border-amber-400/30 bg-amber-100/50 px-2 py-1 text-xs text-amber-700"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Completion message */}
        {clampedProgress >= 100 && (
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-100 to-teal-100 p-3 text-center text-sm font-semibold text-emerald-700">
            ✨ All information collected! Creating your resume...
          </div>
        )}
      </div>
    </section>
  );
}
