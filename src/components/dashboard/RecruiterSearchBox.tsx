"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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

  const handleAddSkill = (skill: string) => {
    if (skill.trim() && !skills.includes(skill)) {
      setSkills([...skills, skill.trim()]);
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center mr-3">
          <svg
            className="w-6 h-6 text-white"
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
        <h2 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
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
        <div className="px-4 py-3 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/30 mb-6">
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
      />
    </div>
  );
}
