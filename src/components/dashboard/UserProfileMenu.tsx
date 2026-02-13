/* eslint-disable max-lines */
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { APP_CONFIG } from "@/config/constants";
import { useUserProfile } from "@/hooks/useUserProfile";

interface UserProfileMenuProps {
  userEmail?: string | null;
  onLogout: () => void;
}

export function UserProfileMenu({ userEmail, onLogout }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { role, jobSeekerTier, recruiterTier } = useUserProfile();

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";
  const displayName = userEmail?.split("@")[0] || "User";
  const emailLabel = userEmail || "Signed out";
  const appVersion = `${APP_CONFIG.VERSION_PREFIX}.${
    process.env.NEXT_PUBLIC_APP_VERSION || "0.0.1"
  }`;

  // Check if user has access to analytics (admin or recruiter)
  const hasAnalyticsAccess = role === "admin" || role === "recruiter";
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative z-40 flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 px-3 py-2 text-left shadow-sm transition-all duration-200 hover:border-[black]/30 hover:bg-white/60 hover:shadow-md"
      >
        {/* Avatar */}
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-gradient-to-br from-[black] to-[black] text-base font-semibold text-white shadow-md">
          <span className="relative text-lg">{userInitial}</span>
        </div>

        {/* Username & Email */}
        <div className="relative hidden min-w-[9rem] sm:flex flex-col">
          <p className="text-sm font-bold leading-tight text-[black]">
            {displayName}
          </p>
          <p className="text-xs text-[black]/70">{emailLabel}</p>
        </div>

        {role === "recruiter" && (
          <span className="relative hidden lg:inline-flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[0.68rem] font-mono font-bold uppercase tracking-widest text-black">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse bg-black" />
            {recruiterTier === "basic"
              ? "Recruiting seat"
              : `${recruiterTier} Recruiter`}
          </span>
        )}

        {role === "admin" && (
          <span className="relative hidden lg:inline-flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[0.68rem] font-mono font-bold uppercase tracking-widest text-black">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse bg-black" />
            Admin
          </span>
        )}

        {role === "jobseeker" && jobSeekerTier !== "basic" && (
          <span className="relative hidden lg:inline-flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[0.68rem] font-mono font-bold uppercase tracking-widest text-black">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse bg-black" />
            {jobSeekerTier} Candidate
          </span>
        )}

        {/* Chevron */}
        <svg
          className={`relative h-4 w-4 text-[black]/60 transition-transform duration-200 group-hover:text-[black] ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 ring-1 ring-black/5">
          {/* User Info Section */}
          <div className="px-4 py-4 border-b border-[black]/10 bg-[black]/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-[black] flex items-center justify-center text-white font-bold text-lg shadow-md">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-bold text-[black]">{displayName}</p>
                <p className="text-xs text-[black]/70">{emailLabel}</p>
              </div>
            </div>
          </div>

          {/* Analytics - Admin/Recruiter Only */}
          {hasAnalyticsAccess && (
            <Link
              href="/analytics"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[black] hover:bg-[black]/5 transition-colors duration-150 font-medium"
            >
              <svg
                className="w-4 h-4 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>View Analytics</span>
              <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                {role === "admin" ? "Admin" : "Pro"}
              </span>
            </Link>
          )}

          {/* 

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile Settings */}
            <Link
              href="/profile/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[black] hover:bg-[black]/5 transition-colors duration-150 font-medium"
            >
              <svg
                className="w-4 h-4 text-[black]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Profile Settings</span>
            </Link>

            {/* Account Settings */}
            <Link
              href="/profile/account"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[black] hover:bg-[black]/5 transition-colors duration-150 font-medium"
            >
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Account & Security</span>
            </Link>

            {/* Subscription */}
            <Link
              href="/profile/subscription"
              onClick={() => setIsOpen(false)}
              className="flex flex-col gap-1 px-4 py-3 hover:bg-[black]/5 transition-colors duration-150"
            >
              <div className="flex items-center gap-3 text-sm text-[black] font-medium">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>Subscription Plans</span>
              </div>

              <div className="flex flex-wrap gap-2 mt-2 ml-7">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-tighter text-gray-400 font-bold mb-0.5">
                    Job Seeker
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold border ${
                      jobSeekerTier === "enterprise"
                        ? "bg-purple-100 text-purple-700 border-purple-200"
                        : jobSeekerTier === "premium"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {jobSeekerTier.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-tighter text-gray-400 font-bold mb-0.5">
                    Recruiter
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-md font-bold border ${
                      recruiterTier === "enterprise"
                        ? "bg-purple-100 text-purple-700 border-purple-200"
                        : recruiterTier === "premium"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {recruiterTier.toUpperCase()}
                  </span>
                </div>
              </div>
            </Link>

            {/* Help & Support */}
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[black] hover:bg-[black]/5 transition-colors duration-150 font-medium"
            >
              <svg
                className="w-4 h-4 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span>Feedback & Support</span>
            </Link>

            {/* Email Support */}
            <a
              href={`mailto:${APP_CONFIG.SUPPORT_EMAIL}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[black] hover:bg-[black]/5 transition-colors duration-150 font-medium"
            >
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>Email Support</span>
            </a>

            {/* Divider */}
            <div className="my-2 border-t border-[black]/10" />

            {/* Logout */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors duration-150 font-medium"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Logout</span>
            </button>

            {/* Version */}
            <div className="px-4 py-2 text-[10px] text-[black]/50 text-center border-t border-[black]/5 font-mono">
              {appVersion}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
