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
    "group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gray-900/80 backdrop-blur-xl text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)] transition-all duration-500",
    isMinimized
      ? "w-16 h-16 p-0 hover:scale-110 cursor-pointer rounded-full"
      : "w-full lg:w-80 p-5 hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(6,182,212,0.25)]",
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
              className="text-gray-800"
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
              className="text-cyan-500 transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-white">
            {clampedProgress}%
          </span>
        </div>
        <div className="absolute inset-0 rounded-full bg-cyan-500/10 blur-md" />
      </button>
    );
  }

  return (
    <section
      className={containerClassName}
      aria-label="Resume progress overview"
    >
      <button
        onClick={() => setIsMinimized(true)}
        className="absolute top-2 right-2 z-20 rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
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
        <div className="absolute -top-16 -right-8 h-44 w-44 rounded-full bg-cyan-500/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-6 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(59,130,246,0.2), transparent 55%), radial-gradient(circle at 80% 30%, rgba(6,182,212,0.25), transparent 55%)",
          }}
        />
      </div>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
              Resume Progress
            </p>
            <p className="text-lg font-semibold text-white/90">
              You're on track—keep going!
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-cyan-300 drop-shadow-sm">
              {clampedProgress}
              <span className="ml-1 text-base align-top text-cyan-100">%</span>
            </p>
            <p className="text-xs uppercase tracking-widest text-gray-400">
              Complete
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800/80">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_25px_rgba(34,211,238,0.5)] transition-[width] duration-500 ease-out"
              style={{ width: `${clampedProgress}%` }}
            >
              <div className="absolute inset-0 opacity-30 mix-blend-screen">
                <div className="h-full w-full bg-[radial-gradient(circle,_rgba(255,255,255,0.5)_0%,_rgba(255,255,255,0)_70%)]" />
              </div>
            </div>
            <div
              className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-blue-500/50 bg-white shadow-[0_0_15px_rgba(59,130,246,0.9)] transition-all duration-500"
              style={{ left: `calc(${indicatorPosition}% - 10px)` }}
              aria-hidden="true"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-gray-500">
            <span>Start</span>
            <span>Finish</span>
          </div>
        </div>

        {/* Collected fields */}
        {showCollectedFields && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-300">
              <span className="inline-block h-2 w-2 rounded-full bg-green-300 animate-pulse" />
              ✓ Collected:
            </p>
            <div className="flex flex-wrap gap-2">
              {collectedFields.map((field) => (
                <span
                  key={field}
                  className="rounded-lg border border-green-500/30 bg-green-900/20 px-2 py-1 text-xs text-green-100"
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
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
              ⏳ Still need:
            </p>
            <div className="flex flex-wrap gap-2">
              {missingFields.slice(0, 5).map((field) => (
                <span
                  key={field}
                  className="rounded-lg border border-amber-400/30 bg-slate-800/80 px-2 py-1 text-xs text-amber-100"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Completion message */}
        {clampedProgress >= 100 && (
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 p-3 text-center text-sm font-semibold text-emerald-200">
            ✨ All information collected! Creating your resume...
          </div>
        )}
      </div>
    </section>
  );
}
