import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import type { AccessRequest, AccessGrant } from "@/types/profileSearch";
import { useAuth } from "@/hooks/useAuth";

export function useAccessRequests() {
  const { user, loading: authLoading } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [activeGrants, setActiveGrants] = useState<AccessGrant[]>([]);
  const [deniedRequests, setDeniedRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;

    try {
      const requestsRef = collection(db, "resumes", user.uid, "accessRequests");
      const q = query(requestsRef, orderBy("timestamp", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              requestId: doc.id,
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate(),
            } as AccessRequest)
        );

        setPendingRequests(docs.filter((r) => r.status === "pending"));
        setDeniedRequests(docs.filter((r) => r.status === "denied"));
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up requests listener:", err);
      // Avoid synchronous state update in effect
      setTimeout(() => setLoading(false), 0);
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || authLoading) return;

    try {
      const grantsRef = collection(db, "resumes", user.uid, "accessGrants");
      const q = query(grantsRef, orderBy("grantedAt", "desc"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) =>
            ({
              grantId: doc.id,
              ...doc.data(),
              grantedAt: doc.data().grantedAt?.toDate(),
              expiresAt: doc.data().expiresAt?.toDate(),
            } as AccessGrant)
        );

        const now = new Date();
        const active = docs.filter((g) => !g.expiresAt || g.expiresAt > now);
        setActiveGrants(active);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up grants listener:", err);
    }
  }, [user, authLoading]);

  return { pendingRequests, activeGrants, deniedRequests, loading } as const;
}
