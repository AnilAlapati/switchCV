"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false, // Don't revalidate when window gets focus
        revalidateOnReconnect: true, // Revalidate when browser regains connection
        dedupingInterval: 5000, // Dedupe requests within 5 seconds
        shouldRetryOnError: false, // Don't retry on error by default
        fetcher: (resource, init) =>
          fetch(resource, init).then((res) => res.json()),
      }}
    >
      {children}
    </SWRConfig>
  );
}
