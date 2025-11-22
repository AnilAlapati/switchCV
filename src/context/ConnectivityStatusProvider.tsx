"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { firebaseStatus } from "@/lib/firebase";

interface ConnectivityState {
  firebase: typeof firebaseStatus;
}

const ConnectivityStatusContext = createContext<ConnectivityState>({
  firebase: firebaseStatus,
});

export const ConnectivityStatusProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const value = useMemo<ConnectivityState>(
    () => ({ firebase: firebaseStatus }),
    []
  );

  return (
    <ConnectivityStatusContext.Provider value={value}>
      {children}
    </ConnectivityStatusContext.Provider>
  );
};

export const useConnectivityStatus = () => {
  return useContext(ConnectivityStatusContext);
};
