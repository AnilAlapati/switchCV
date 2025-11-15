"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  SearchInterface,
  SearchResult,
  RecruiterSearchFilters,
} from "@/components/recruiter/SearchInterface";
import { RequestManagement } from "@/components/recruiter/RequestManagement";
import { RecruiterPortalLoading } from "@/components/recruiter/RecruiterPortalLoading";
import { RecruiterPortalAuth } from "@/components/recruiter/RecruiterPortalAuth";
import { RecruiterPortalHeader } from "@/components/recruiter/RecruiterPortalHeader";
import { RecruiterPortalTabs } from "@/components/recruiter/RecruiterPortalTabs";
import { RecruiterRequestForm } from "@/components/recruiter/RecruiterRequestForm";
import type { RecruiterContactRequest } from "@/types/profileSearch";

type RequestFormData = {
  fields: Array<"email" | "phone" | "address" | "personalLinks">;
  purpose: string;
  duration: "1hour" | "1day" | "1week" | "30days";
};

export default function RecruiterPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"search" | "requests">("search");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] =
    useState<SearchResult | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState<RequestFormData>({
    fields: [],
    purpose: "",
    duration: "1week",
  });
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return <RecruiterPortalLoading />;
  }

  if (!user) {
    return <RecruiterPortalAuth />;
  }

  const handleSearch = async (filters: RecruiterSearchFilters) => {
    try {
      setSearchLoading(true);
      setSearchError(null);

      const params = new URLSearchParams();
      if (filters.query) params.append("q", filters.query);
      if (filters.location) params.append("location", filters.location);
      if (filters.targetRole) params.append("role", filters.targetRole);
      if (filters.skills?.length)
        params.append("skills", filters.skills.join(","));
      params.append("sort", filters.sortBy);

      const response = await fetch(`/api/profiles/search?${params}`);
      if (!response.ok) {
        throw new Error("Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectCandidate = (userId: string, result: SearchResult) => {
    setSelectedCandidate(result);
    setShowRequestForm(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || requestFormData.fields.length === 0) {
      alert("Please select at least one field to request");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/recruiters/request-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruiterId: user.uid,
          recruiterName: user.displayName || "Recruiter",
          recruiterEmail: user.email,
          companyName: "Your Company",
          userId: selectedCandidate.userId,
          resumeId: "",
          requestedFields: requestFormData.fields,
          purpose: requestFormData.purpose,
          proposedDuration: requestFormData.duration,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Request failed");
      }

      alert("✅ Request submitted for review!");
      setShowRequestForm(false);
      setSelectedCandidate(null);
      setRequestFormData({
        fields: [],
        purpose: "",
        duration: "1week",
      });
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : "Request failed"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <RecruiterPortalHeader />

      <RecruiterPortalTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "search" && (
          <>
            <SearchInterface
              onSearch={handleSearch}
              results={searchResults}
              isLoading={searchLoading}
              error={searchError}
              onSelectCandidate={handleSelectCandidate}
            />

            {showRequestForm && selectedCandidate && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Request Contact Information
                    </h2>
                    <button
                      onClick={() => setShowRequestForm(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <RecruiterRequestForm
                    candidate={selectedCandidate}
                    formData={requestFormData}
                    onFormChange={setRequestFormData}
                    onSubmit={handleSubmitRequest}
                    onClose={() => setShowRequestForm(false)}
                    isSubmitting={submitting}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "requests" && (
          <RequestManagement
            recruiterId={user.uid}
            onRequestSelect={(request: RecruiterContactRequest) => {
              console.log("Selected request:", request);
            }}
          />
        )}
      </div>
    </div>
  );
}
