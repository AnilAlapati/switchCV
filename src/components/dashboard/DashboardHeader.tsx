"use client";

import { UserProfileMenu } from "./UserProfileMenu";

interface DashboardHeaderProps {
  userEmail?: string | null;
  onLogout: () => void;
  userRole?: string | null;
}

export function DashboardHeader({
  userEmail,
  onLogout,
  userRole,
}: DashboardHeaderProps) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const getRoleDisplay = (role: string | null | undefined) => {
    if (!role) return null;
    const isRecruiter = role === "recruiter" || role === "admin";
    return {
      label: isRecruiter ? "Recruiter" : "Job Seeker",
      color: isRecruiter
        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
        : "bg-blue-100 text-blue-800 border-blue-200",
    };
  };

  const roleInfo = getRoleDisplay(userRole);

  return (
    <header className="relative z-50 border-b border-white/50 bg-white/30 backdrop-blur-md">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm">
              <svg
                className="relative h-6 w-6 text-[#2C4A3B]"
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
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
                      SwitchCV
                    </p>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                      Agentic
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#1A2F25]">
                    {roleInfo?.label || "Career"}{" "}
                    <span className="text-indigo-600">Agent</span>
                  </h1>
                </div>
              </div>
              <p className="max-w-xl text-sm text-[#1A2F25]/70">
                Harnessing autonomous intelligence to surface your next big
                move.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[#2C4A3B]/40 pt-3">
                <div className="flex items-center gap-2">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-blue-600" />
                  Live Momentum
                </div>
                <div className="h-3 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-2">
                  <svg
                    className="h-3 w-3 opacity-50"
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
                </div>
              </div>
            </div>
          </div>

          {/* User Profile Menu */}
          <div className="flex items-center gap-4">
            <UserProfileMenu userEmail={userEmail} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </header>
  );
}
