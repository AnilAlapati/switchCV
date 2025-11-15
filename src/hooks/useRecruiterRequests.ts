import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import type { RecruiterContactRequest } from "@/types/profileSearch";

interface PendingRequest {
  id: string;
  request: RecruiterContactRequest;
}

export function useRecruiterRequests() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || authLoading) return;

    const q = query(
      collection(db, "recruiterRequests"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pending = snapshot.docs.map((doc) => ({
        id: doc.id,
        request: doc.data() as RecruiterContactRequest,
      }));

      pending.sort(
        (a, b) =>
          new Date(b.request.createdAt).getTime() -
          new Date(a.request.createdAt).getTime()
      );

      setRequests(pending);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  return { requests, loading } as const;
}
