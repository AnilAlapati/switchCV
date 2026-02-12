// src/context/DashboardMetricsContext.tsx
"use client";

import { createContext, useContext, useMemo } from "react";
import type { JobSeekerMetrics, RecruiterMetrics } from "@/types/dashboard";

export interface DashboardMetricsContextValue {
  loading: boolean;
  jobSeekerMetrics: JobSeekerMetrics | null;
  recruiterMetrics: RecruiterMetrics | null;
  refreshJobSeekerMetrics?: () => Promise<unknown>;
  refreshRecruiterMetrics?: () => Promise<unknown>;
}

const DashboardMetricsContext =
  createContext<DashboardMetricsContextValue | null>(null);

interface DashboardMetricsProviderProps {
  children: React.ReactNode;
  value: DashboardMetricsContextValue;
}

export function DashboardMetricsProvider({
  children,
  value,
}: DashboardMetricsProviderProps) {
  const {
    loading,
    jobSeekerMetrics,
    recruiterMetrics,
    refreshJobSeekerMetrics,
    refreshRecruiterMetrics,
  } = value;

  const memoizedValue = useMemo(
    () => ({
      loading,
      jobSeekerMetrics,
      recruiterMetrics,
      refreshJobSeekerMetrics,
      refreshRecruiterMetrics,
    }),
    [
      loading,
      jobSeekerMetrics,
      recruiterMetrics,
      refreshJobSeekerMetrics,
      refreshRecruiterMetrics,
    ]
  );

  return (
    <DashboardMetricsContext.Provider value={memoizedValue}>
      {children}
    </DashboardMetricsContext.Provider>
  );
}

export function useDashboardMetricsContext() {
  const context = useContext(DashboardMetricsContext);
  if (!context) {
    throw new Error(
      "useDashboardMetricsContext must be used within a DashboardMetricsProvider"
    );
  }
  return context;
}

export function useOptionalDashboardMetricsContext() {
  return useContext(DashboardMetricsContext);
}
