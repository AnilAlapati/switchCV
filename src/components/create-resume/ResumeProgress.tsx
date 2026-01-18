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
  const [isMinimized, setIsMinimized] = useState(true);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  if (clampedProgress === 0) return null;

  const showCollectedFields = collectedFields.length > 0;
  const showMissingFields =
    missingFields.length > 0 && missingFields.length <= 5;

  const containerClassName = [
    "group relative overflow-hidden transition-all duration-500",
    isMinimized
      ? "w-16 h-16 p-0 hover:scale-105 cursor-pointer rounded-full shadow-lg border-2 border-black/5 bg-[#FFFFF8]"
      : "w-full lg:w-64 p-5 rounded-xl shadow-xl border border-black/10 bg-[#FFFFF8]",
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
              strokeWidth="3"
              fill="transparent"
              className="text-black/5"
            />
            <circle
              cx="50%"
              cy="50%"
              r="24"
              stroke="currentColor"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - clampedProgress / 100)}
              className="text-black transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-black font-serif">
            {clampedProgress}%
          </span>
        </div>
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
      {/* Paper texture overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />

      <button
        onClick={() => setIsMinimized(true)}
        className="absolute top-2 right-2 z-20 rounded-full p-1.5 text-black/40 hover:text-black hover:bg-black/5 transition-all"
        aria-label="Minimize"
        title="Minimize progress tracker"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div className="relative z-10 space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-black/40 font-medium">
            Progress
          </p>
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-lg font-bold text-black leading-tight">
              {clampedProgress < 50 ? "Getting Started" : clampedProgress < 80 ? "Making Progress" : "Almost Done"}
            </h3>
            <p className="text-2xl font-serif font-black text-black">
              {clampedProgress}<span className="text-sm align-top opacity-50">%</span>
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full bg-black transition-[width] duration-500 ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {/* Collected fields */}
        {showCollectedFields && (
          <div className="space-y-2 pt-2 border-t border-black/5">
            <p className="text-[10px] uppercase tracking-wider text-black/40 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-black/20"></span>
              Collected
            </p>
            <div className="flex flex-wrap gap-1.5">
              {collectedFields.map((field) => (
                <span
                  key={field}
                  className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-medium text-black/70 capitalize border border-black/5"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing fields */}
        {showMissingFields && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-black/40 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-black/10 animate-pulse"></span>
              Still Need
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missingFields.slice(0, 5).map((field) => (
                <span
                  key={field}
                  className="rounded-md border border-dashed border-black/20 px-2 py-0.5 text-[10px] font-medium text-black/40 capitalize"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Completion message */}
        {clampedProgress >= 100 && (
          <div className="rounded-lg bg-black text-white p-2.5 text-center text-xs font-medium mt-2">
            ✨ Creating your resume...
          </div>
        )}
      </div>
    </section>
  );
}
