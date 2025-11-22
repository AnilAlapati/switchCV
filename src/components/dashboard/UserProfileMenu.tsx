"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface UserProfileMenuProps {
  userEmail?: string | null;
  onLogout: () => void;
}

export function UserProfileMenu({ userEmail, onLogout }: UserProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";
  const displayName = userEmail?.split("@")[0] || "User";
  const emailLabel = userEmail || "Signed out";

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
        className="group relative z-40 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)] transition-all duration-200 hover:border-cyan-400/40 hover:bg-white/[0.08]"
      >
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-transparent to-purple-600/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        {/* Avatar */}
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 text-base font-semibold text-white shadow-[0_12px_30px_-20px_rgba(56,189,248,0.9)]">
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/60 to-purple-600/60 opacity-70" />
          <span className="relative text-lg">{userInitial}</span>
        </div>

        {/* Username & Email */}
        <div className="relative hidden min-w-[9rem] sm:flex flex-col">
          <p className="text-sm font-semibold leading-tight text-white">
            {displayName}
          </p>
          <p className="text-xs text-slate-400">{emailLabel}</p>
        </div>

        <span className="relative hidden lg:inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-wide text-emerald-300">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
          Recruiting seat
        </span>

        {/* Chevron */}
        <svg
          className={`relative h-4 w-4 text-slate-300 transition-transform duration-200 group-hover:text-white ${
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
        <div className="absolute right-0 mt-2 w-72 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl shadow-2xl shadow-black/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {/* User Info Section */}
          <div className="px-4 py-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/25">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400">{emailLabel}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile Settings */}
            <Link
              href="/profile/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 transition-colors duration-150"
            >
              <svg
                className="w-4 h-4 text-cyan-400"
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
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 transition-colors duration-150"
            >
              <svg
                className="w-4 h-4 text-purple-400"
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
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 transition-colors duration-150"
            >
              <svg
                className="w-4 h-4 text-amber-400"
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
              <span>Subscription Plan</span>
              <span className="ml-auto px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300">
                Basic
              </span>
            </Link>

            {/* Help & Support */}
            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 transition-colors duration-150"
            >
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Help & Support</span>
            </Link>

            {/* Divider */}
            <div className="my-2 border-t border-white/10" />

            {/* Logout */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-300 hover:bg-red-500/10 transition-colors duration-150"
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
          </div>
        </div>
      )}
    </div>
  );
}
