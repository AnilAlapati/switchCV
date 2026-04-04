"use client";

import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { RecruiterSearchBox } from "@/components/dashboard/RecruiterSearchBox";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  JDUpload,
  type ParsedJDPreview,
} from "@/components/recruiter/JDUpload";
import { SearchResults } from "@/components/recruiter/SearchResults";
import { Loader2 } from "lucide-react";

function SearchPageContent() {
  const { user } = useAuth();
  const { role, loading } = useUserProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");

  const [parsedJD, setParsedJD] = useState<ParsedJDPreview | null>(null);
  const [jdResults, setJdResults] = useState<any[]>([]);
  const [jdLoading, setJdLoading] = useState(false);
  const [jdError, setJdError] = useState<string | null>(null);

  const handleJDSearch = async (text: string, useAI: boolean) => {
    if (!user) {
      setJdError("Please sign in to search");
      return;
    }

    setJdLoading(true);
    setJdError(null);
    setParsedJD(null);
    setJdResults([]);

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/recruiter/jd-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jdText: text, useAI }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setParsedJD(data.parsedJD);
      // Map results to match SearchResults component expectation
      setJdResults(
        data.results.map((r: any) => ({
          userId: r.userId,
          displayName: r.userName || r.displayName || "Unknown Candidate",
          role: r.title || r.role || "Software Engineer",
          skills: r.skills || [],
          bio: r.summary || r.bio || "No summary available",
          location: r.location,
          hasApproval: false, // Default as we don't know yet
        })),
      );
    } catch (err) {
      setJdError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setJdLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (role !== "recruiter" && role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <DashboardBackground>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
        </div>
      </DashboardBackground>
    );
  }

  return (
    <DashboardBackground>
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header>
            <h1 className="text-3xl font-bold font-serif text-slate-900 mb-6">
              Recruiter Search
            </h1>
          </header>

          <main>
            {modeParam === "jd" ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg p-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        Search by Job Description
                      </h2>
                      <button
                        onClick={() => router.push("/recruiter/search")}
                        className="text-sm font-medium text-slate-500 hover:text-slate-900 underline"
                      >
                        ← Back to Talent Search
                      </button>
                    </div>
                    <p className="text-slate-600">
                      Upload or paste a job description. Our AI will analyze
                      requirements and rank candidates by fit.
                    </p>
                  </div>
                  <JDUpload
                    onSearch={handleJDSearch}
                    isLoading={jdLoading}
                    parsedJD={parsedJD}
                    error={jdError}
                  />
                </div>

                {(jdResults.length > 0 || jdLoading) && (
                  <SearchResults
                    results={jdResults}
                    isLoading={jdLoading}
                    query={parsedJD?.title || "Job Description Search"}
                  />
                )}
              </div>
            ) : (
              <RecruiterSearchBox />
            )}
          </main>
        </div>
      </div>
    </DashboardBackground>
  );
}

export default function RecruiterSearchPage() {
  return (
    <Suspense
      fallback={
        <DashboardBackground>
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        </DashboardBackground>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
