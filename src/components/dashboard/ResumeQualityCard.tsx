"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface QualityMetrics {
  quality: number;
}

interface ResumeQualityCardProps {
  hasResume?: boolean;
}

export function ResumeQualityCard({ hasResume }: ResumeQualityCardProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<QualityMetrics>({ quality: 0 });
  const [loading, setLoading] = useState(true);
  const resumePrompt = !loading && hasResume === false;
  const qualityValue = resumePrompt ? 0 : metrics.quality;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchMetrics();
  }, [user]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(
        `/api/jobseeker/metrics?userId=${user?.uid}`
      );
      if (response.ok) {
        const data = await response.json();
        setMetrics({ quality: data.quality || 0 });
      }
    } catch (error) {
      console.error("Failed to fetch resume quality:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl shadow-black/50 p-6 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-400 truncate">
              Resume Quality
            </dt>
            <dd className="text-2xl font-bold text-white">
              {loading ? "-" : `${qualityValue}%`}
            </dd>
          </dl>
        </div>
      </div>
      <div className="mt-4">
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: loading ? "0%" : `${qualityValue}%` }}
          ></div>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          {loading
            ? "Loading..."
            : resumePrompt
            ? "Create a resume to see quality insights"
            : qualityValue === 0
            ? "Generate your first analysis to view quality"
            : qualityValue >= 80
            ? "Well optimized resume"
            : qualityValue >= 60
            ? "Good resume quality"
            : "Resume needs improvement"}
        </p>
      </div>
    </div>
  );
}
