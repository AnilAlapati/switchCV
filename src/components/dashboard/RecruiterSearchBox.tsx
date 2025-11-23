"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import type { SearchResult } from "./RecruiterSearchForm";
import { RecruiterSearchForm } from "./RecruiterSearchForm";
import { RecruiterSearchResults } from "./RecruiterSearchResults";

const PREMIUM_FILTERS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PREMIUM_FILTERS === "true" ||
  process.env.NODE_ENV === "test";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RecruiterSearchBoxProps {}

export function RecruiterSearchBox({}: RecruiterSearchBoxProps = {}) {
  const { user } = useAuth();
  const [searchMode, setSearchMode] = useState<"basic" | "premium">("basic");
  const [userId, setUserId] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [requestDialog, setRequestDialog] = useState<{
    isOpen: boolean;
    profileName: string;
    profileId: string;
  }>({
    isOpen: false,
    profileName: "",
    profileId: "",
  });

  const effectiveSearchMode = useMemo<"basic" | "premium">(() => {
    return PREMIUM_FILTERS_ENABLED ? searchMode : "basic";
  }, [searchMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    if (effectiveSearchMode === "basic" && !userId.trim()) {
      setError("Please enter a candidate ID");
      return;
    }

    if (
      effectiveSearchMode === "premium" &&
      !skills.length &&
      !location.trim()
    ) {
      setError("Please enter skills or location");
      return;
    }

    setLoading(true);
    setError(null);
    setNotification(null);
    setSearchResults([]);

    try {
      const response = await fetch("/api/recruiter/search-resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterId: user.uid,
          ...(effectiveSearchMode === "basic" && { userId }),
          ...(effectiveSearchMode === "premium" && {
            ...(skills.length > 0 && { skills }),
            ...(location && { location }),
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setNotification(data.notification || null);
      setSearched(true);

      if (data.results.length === 0 && !data.notification) {
        setNotification("No resumes found matching your search");
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "Failed to search resumes");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResume = (resumeId: string) => {
    window.open(`/resumes/${resumeId}`, "_blank");
  };

  const handleRequestAccess = (resumeId: string, userName: string) => {
    setRequestDialog({
      isOpen: true,
      profileName: userName,
      profileId: resumeId,
    });
  };

  const handleRequestSuccess = () => {
    setNotification("Request sent successfully!");
    // Refresh search to update status
    if (searched) {
      handleSearch({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  const handleAddSkill = (skill: string) => {
    if (skill.trim() && !skills.includes(skill)) {
      setSkills([...skills, skill.trim()]);
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm ring-1 ring-white/5 lg:p-8">
        <div className="flex flex-col gap-6">
          <header className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 px-4 py-1.5 backdrop-blur-sm">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
                    Recruiter Workspace
                  </span>
                </div>
                <div>
                  <h2 className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-3xl font-black text-transparent lg:text-4xl">
                    Resume Search
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400 lg:text-base">
                    Discover talent instantly with advanced filters and
                    real-time insights
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 backdrop-blur-sm">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      loading
                        ? "animate-pulse bg-amber-400 shadow-lg shadow-amber-400/50"
                        : searched
                        ? "bg-emerald-400 shadow-lg shadow-emerald-400/50"
                        : "bg-slate-500"
                    }`}
                  />
                  <span className="text-xs font-semibold text-slate-300">
                    {loading
                      ? "Searching"
                      : searched
                      ? "Live Results"
                      : "Ready"}
                  </span>
                </div>
                {searched && (
                  <span className="hidden text-xs text-slate-500 lg:inline">
                    Updated just now
                  </span>
                )}
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr),340px]">
            <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-6 backdrop-blur-sm">
              <RecruiterSearchForm
                searchMode={effectiveSearchMode}
                setSearchMode={setSearchMode}
                premiumFiltersEnabled={PREMIUM_FILTERS_ENABLED}
                userId={userId}
                setUserId={setUserId}
                skills={skills}
                location={location}
                setLocation={setLocation}
                loading={loading}
                onSearch={handleSearch}
                onAddSkill={handleAddSkill}
                onRemoveSkill={handleRemoveSkill}
                searchResults={searchResults}
                setSearchResults={setSearchResults}
                setSearched={setSearched}
              />
            </div>
          </div>
        </div>
      </div>

      <RecruiterSearchResults
        results={searchResults}
        searched={searched}
        error={error}
        notification={notification}
        searchMode={effectiveSearchMode}
        onViewResume={handleViewResume}
        onRequestAccess={handleRequestAccess}
      />

      <RequestAccessDialog
        isOpen={requestDialog.isOpen}
        onClose={() => setRequestDialog((prev) => ({ ...prev, isOpen: false }))}
        profileName={requestDialog.profileName}
        profileId={requestDialog.profileId}
        onSuccess={handleRequestSuccess}
      />
    </section>
  );
}
