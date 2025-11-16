"use client";

import { UserProfileMenu } from "./UserProfileMenu";

interface DashboardHeaderProps {
  userEmail?: string | null;
  onLogout: () => void;
}

export function DashboardHeader({ userEmail, onLogout }: DashboardHeaderProps) {
  return (
    <header className="relative z-40 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl shadow-lg shadow-cyan-500/25">
              <svg
                className="w-6 h-6 text-white"
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
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                SwitchCV Dashboard
              </h1>
              <p className="text-slate-400 text-sm">Welcome back!</p>
            </div>
          </div>

          {/* User Profile Menu */}
          <UserProfileMenu userEmail={userEmail} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
