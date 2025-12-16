"use client";

import { useSystemConfig } from "@/context/SystemConfigProvider";
import { useEffect, type ReactNode } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logger } from "@/lib/logger";

export const BlockingGuard = ({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element => {
  const { config } = useSystemConfig();
  const { maintenance } = config;

  useEffect(() => {
    if (maintenance.isActive && maintenance.blocking && auth) {
      void signOut(auth).catch((error) => {
        logger.error("Failed to sign out during maintenance lockout:", error);
      });
    }
  }, [maintenance.isActive, maintenance.blocking]);

  // If we are still loading and have no cached config, we default to showing the app (fail open).
  // However, if we have a cached config that says blocking, we block immediately.
  // The provider handles the initial state logic.

  if (maintenance.isActive && maintenance.blocking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-xl">
          <div className="mb-6 flex justify-center">
            <svg
              className="h-16 w-16 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Service Temporarily Suspended
          </h1>
          <p className="mb-6 text-slate-600">
            {maintenance.message ||
              "We are currently performing essential maintenance. Access to the platform is suspended, and all active sessions have been concluded. We apologize for the inconvenience."}
          </p>
          <div className="text-xs text-slate-400">Access Restricted</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
