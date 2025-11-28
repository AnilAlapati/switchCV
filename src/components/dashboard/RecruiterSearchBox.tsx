"use client";

import { logger } from "@/lib/logger";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import type { SearchResult, SearchModeType } from "./RecruiterSearchForm";
import { RecruiterSearchForm } from "./RecruiterSearchForm";
import { RecruiterSearchResults } from "./RecruiterSearchResults";
import {
  RecruiterSearchHeader,
  RecruiterSearchLoadingState,
} from "./RecruiterSearchHeader";
import { useAiSearch } from "./useAiSearch";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface RecruiterSearchBoxProps {}

export function RecruiterSearchBox({}: RecruiterSearchBoxProps = {}) {
  const { user } = useAuth();
  const { isPremiumOrHigher, loading: tierLoading } = useTier();
  const [searchMode, setSearchMode] = useState<SearchModeType>("ai"); // Default to AI search
  const [userId, setUserId] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // AI Search hook
  const { aiQuery, setAiQuery, aiSearching, aiError, aiQuota, handleAiSearch } =
    useAiSearch({
      user,
      setSearchResults,
      setSearched,
      setNotification,
    });

  const [requestDialog, setRequestDialog] = useState<{
    isOpen: boolean;
    profileName: string;
    profileId: string;
  }>({
    isOpen: false,
    profileName: "",
    profileId: "",
  });

  /**
   * Premium filters are enabled when:
   * 1. Explicitly enabled via env var, OR
   * 2. Running tests, OR
   * 3. User has premium or enterprise tier (includes dev mode override)
   */
  const premiumFiltersEnabled =
    process.env.NEXT_PUBLIC_ENABLE_PREMIUM_FILTERS === "true" ||
    process.env.NODE_ENV === "test" ||
    isPremiumOrHigher;

  /**
   * AI Search is enabled for premium or enterprise users
   */
  const aiSearchEnabled = isPremiumOrHigher;

  const effectiveSearchMode = useMemo<SearchModeType>(() => {
    if (searchMode === "ai" && !aiSearchEnabled) return "basic";
    if (searchMode === "premium" && !premiumFiltersEnabled) return "basic";
    return searchMode;
  }, [searchMode, premiumFiltersEnabled, aiSearchEnabled]);

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
      const token = await user.getIdToken();
      const response = await fetch("/api/recruiter/search-resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      logger.error({ err: err }, "Search error:");
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

  // Show loading state while tier is being determined
  if (tierLoading) {
    return <RecruiterSearchLoadingState />;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-950/90 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm ring-1 ring-white/5 lg:p-8">
        <div className="flex flex-col gap-6">
          <RecruiterSearchHeader
            loading={loading}
            aiSearching={aiSearching}
            searched={searched}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr),340px]">
            <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-6 backdrop-blur-sm">
              <RecruiterSearchForm
                searchMode={effectiveSearchMode}
                setSearchMode={setSearchMode}
                premiumFiltersEnabled={premiumFiltersEnabled}
                aiSearchEnabled={aiSearchEnabled}
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
                // AI Search props
                aiQuery={aiQuery}
                setAiQuery={setAiQuery}
                onAiSearch={handleAiSearch}
                aiSearching={aiSearching}
                aiError={aiError}
                aiQuota={aiQuota}
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
