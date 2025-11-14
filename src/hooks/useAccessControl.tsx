// src/hooks/useAccessControl.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./useAuth";
import {
  AccessRequest,
  AccessGrant,
  Notification,
} from "@/types/profileSearch";

interface UseAccessControlOptions {
  resumeId: string;
}

interface UseAccessControlResult {
  pendingRequests: AccessRequest[];
  activeGrants: AccessGrant[];
  deniedRequests: AccessRequest[];
  loading: boolean;
  error: string | null;
  approve: (
    requestId: string,
    duration: "1hour" | "1day" | "1week" | "forever"
  ) => Promise<void>;
  deny: (requestId: string, reason?: string) => Promise<void>;
  revoke: (grantId: string) => Promise<void>;
}

export function useAccessControl({
  resumeId,
}: UseAccessControlOptions): UseAccessControlResult {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [activeGrants, setActiveGrants] = useState<AccessGrant[]>([]);
  const [deniedRequests, setDeniedRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to pending requests
  useEffect(() => {
    if (!user || !resumeId) return;

    const requestsRef = collection(
      db,
      "resumeProfiles",
      resumeId,
      "accessRequests"
    );

    // Pending requests
    const pendingQ = query(requestsRef, where("status", "==", "pending"));
    const unsubscribePending = onSnapshot(
      pendingQ,
      (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
          requestId: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date(),
        })) as AccessRequest[];
        setPendingRequests(requests);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching pending requests:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Denied requests
    const deniedQ = query(requestsRef, where("status", "==", "denied"));
    const unsubscribeDenied = onSnapshot(deniedQ, (snapshot) => {
      const requests = snapshot.docs.map((doc) => ({
        requestId: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      })) as AccessRequest[];
      setDeniedRequests(requests);
    });

    return () => {
      unsubscribePending();
      unsubscribeDenied();
    };
  }, [user, resumeId]);

  // Subscribe to active grants
  useEffect(() => {
    if (!user || !resumeId) return;

    const grantsRef = collection(
      db,
      "resumeProfiles",
      resumeId,
      "accessGrants"
    );

    const unsubscribe = onSnapshot(
      grantsRef,
      (snapshot) => {
        const grants = snapshot.docs
          .map((doc) => ({
            grantId: doc.id,
            ...doc.data(),
            grantedAt: doc.data().grantedAt?.toDate?.() || new Date(),
            expiresAt: doc.data().expiresAt?.toDate?.() || null,
          }))
          .filter((grant) => {
            // Only show non-expired grants
            if (grant.expiresAt === null) return true; // Forever grants
            return grant.expiresAt > new Date();
          }) as AccessGrant[];
        setActiveGrants(grants);
      },
      (err) => {
        console.error("Error fetching access grants:", err);
        setError(err.message);
      }
    );

    return () => unsubscribe();
  }, [user, resumeId]);

  const approve = useCallback(
    async (
      requestId: string,
      duration: "1hour" | "1day" | "1week" | "forever"
    ) => {
      try {
        // Call backend API
        const response = await fetch("/api/profiles/approve-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, resumeId, duration }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to approve access");
        }

        console.log("✅ Access approved successfully");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Error approving access:", errorMsg);
        setError(errorMsg);
        throw err;
      }
    },
    [resumeId]
  );

  const deny = useCallback(
    async (requestId: string, reason?: string) => {
      try {
        const response = await fetch("/api/profiles/deny-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, resumeId, reason }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to deny access");
        }

        console.log("✅ Request denied successfully");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Error denying access:", errorMsg);
        setError(errorMsg);
        throw err;
      }
    },
    [resumeId]
  );

  const revoke = useCallback(
    async (grantId: string) => {
      try {
        const response = await fetch("/api/profiles/revoke-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grantId, resumeId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to revoke access");
        }

        console.log("✅ Access revoked successfully");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Error revoking access:", errorMsg);
        setError(errorMsg);
        throw err;
      }
    },
    [resumeId]
  );

  return {
    pendingRequests,
    activeGrants,
    deniedRequests,
    loading,
    error,
    approve,
    deny,
    revoke,
  };
}
