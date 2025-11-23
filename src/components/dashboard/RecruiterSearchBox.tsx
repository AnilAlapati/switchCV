"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RequestAccessDialog } from "@/components/RequestAccessDialog";
import type { SearchResult } from "./RecruiterSearchForm";
import { RecruiterSearchForm } from "./RecruiterSearchForm";
import { RecruiterSearchResults } from "./RecruiterSearchResults";

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      setError("User not authenticated");
      return;
    }

    if (searchMode === "basic" && !userId.trim()) {
      setError("Please enter a candidate ID");
      return;
    }

    if (searchMode === "premium" && !skills.length && !location.trim()) {
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
          ...(searchMode === "basic" && { userId }),
          ...(searchMode === "premium" && {
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40 transition hover:border-cyan-500/40">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-cyan-300">
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white">
          Recruiter Resume Search
        </h2>
      </div>

      {/* Search Form */}
      <RecruiterSearchForm
        searchMode={searchMode}
        setSearchMode={setSearchMode}
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

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm font-medium text-red-200">
          {error}
        </div>
      )}

      {/* Results or States */}
      <RecruiterSearchResults
        results={searchResults}
        searched={searched}
        error={null}
        notification={notification}
        searchMode={searchMode}
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
    </div>
  );
}
