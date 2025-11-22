"use client";

import { UserProfileMenu } from "./UserProfileMenu";

interface DashboardHeaderProps {
  userEmail?: string | null;
  onLogout: () => void;
}

export function DashboardHeader({ userEmail, onLogout }: DashboardHeaderProps) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="relative z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-16 right-0 h-56 w-56 rounded-full bg-purple-600/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 shadow-lg shadow-slate-950/40">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/10 blur" />
              <svg
                className="relative h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                  SwitchCV
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  SwitchCV Dashboard
                </h1>
              </div>
              <p className="max-w-xl text-sm text-slate-300">
                Surface the most actionable signals so you can respond faster,
                nurture top candidates, and keep your pipeline moving toward the
                next offer.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/70 px-3 py-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Live momentum insights synced
                </span>
                <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1 text-slate-400">
                  <svg
                    className="h-3.5 w-3.5 text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6l3 3"
                    />
                  </svg>
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>

          {/* User Profile Menu */}
          <UserProfileMenu userEmail={userEmail} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
