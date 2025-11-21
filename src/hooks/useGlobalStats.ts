import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface GlobalStats {
  resumes: string;
  users: string;
  completion: string;
}

const DEFAULT_STATS: GlobalStats = {
  resumes: "12k+",
  users: "10k+",
  completion: "98%",
};

export function useGlobalStats() {
  const [stats, setStats] = useState<GlobalStats>(DEFAULT_STATS);

  useEffect(() => {
    const fetchStats = async () => {
      if (!db || (db as { __isMock?: boolean }).__isMock) {
        return;
      }

      try {
        const statsDoc = await getDoc(doc(db, "analytics", "globalStats"));

        if (statsDoc.exists()) {
          const data = statsDoc.data();
          setStats((prev) => ({
            ...prev,
            resumes: data.resumeCount ? `${data.resumeCount}+` : prev.resumes,
            users: data.userCount ? `${data.userCount}+` : prev.users,
          }));
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats(DEFAULT_STATS);
      }
    };

    fetchStats();
  }, []);

  return { stats };
}
