"use client";

import { useSystemConfig } from "@/context/SystemConfigProvider";
import { useEffect, type ReactNode } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { logger } from "@/lib/logger";
import { MaintenancePage } from "@/components/layout/MaintenancePage";

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
    return <MaintenancePage />;
  }

  return <>{children}</>;
};
