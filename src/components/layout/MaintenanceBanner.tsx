"use client";

import { useMemo, useState, useEffect } from "react";
import { useSystemConfig } from "@/context/SystemConfigProvider";

const DISMISS_CACHE_KEY = "switchcv:maintenance-banner:dismissed";

export const MaintenanceBanner = (): React.JSX.Element | null => {
  const {
    config: { maintenance },
    loading,
  } = useSystemConfig();

  const bannerId = useMemo(() => {
    const suffix = maintenance.message?.trim() || "system-maintenance";
    return `${maintenance.blocking ? "blocking" : "info"}:${suffix}`;
  }, [maintenance.blocking, maintenance.message]);

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.sessionStorage.getItem(DISMISS_CACHE_KEY);
        return stored === bannerId;
      } catch {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.sessionStorage.getItem(DISMISS_CACHE_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsDismissed(stored === bannerId);
      } catch {
        // Ignore session storage errors
      }
    }
  }, [bannerId]);

  if (loading || !maintenance.isActive) {
    return null;
  }

  const isBlocking = maintenance.blocking;
  const canDismiss = !isBlocking;

  if (isDismissed && canDismiss) {
    return null;
  }

  const baseClasses = isBlocking
    ? "bg-red-600 text-white"
    : "bg-amber-500 text-slate-900";

  const message =
    maintenance.message?.trim() ||
    (isBlocking
      ? "The system is undergoing maintenance. Access is temporarily restricted."
      : "We are performing scheduled maintenance. Some features may be limited.");

  const handleDismiss = () => {
    if (!canDismiss || typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(DISMISS_CACHE_KEY, bannerId);
    } catch (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _error
    ) {
      // Ignore storage failures and still hide banner for the session.
    }

    setIsDismissed(true);
  };

  return (
    <div
      className={`${baseClasses} flex w-full items-center justify-between px-4 py-2 text-sm shadow`}
      role="status"
      aria-live={isBlocking ? "assertive" : "polite"}
    >
      <p className="mr-4 font-medium">{message}</p>
      {canDismiss && (
        <button
          type="button"
          className="rounded border border-current px-3 py-1 text-xs font-semibold uppercase tracking-wide"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      )}
    </div>
  );
};
