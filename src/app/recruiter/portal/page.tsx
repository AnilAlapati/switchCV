"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  SearchInterface,
  SearchResult,
  RecruiterSearchFilters,
} from "@/components/recruiter/SearchInterface";
import { RequestManagement } from "@/components/recruiter/RequestManagement";
import { RecruiterContactRequest } from "@/types/profileSearch";

export default function RecruiterPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"search" | "requests">("search");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] =
    useState<SearchResult | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    fields: [] as Array<"email" | "phone" | "address" | "personalLinks">,
    purpose: "",
    duration: "1week" as "1hour" | "1day" | "1week" | "30days",
  });
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Recruiter Portal
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access the recruiter portal
          </p>
          <a
            href="/auth"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const handleSearch = async (filters: RecruiterSearchFilters) => {
    try {
      setSearchLoading(true);
      setSearchError(null);

      // Build query params
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
          companyName: "Your Company", // TODO: Get from recruiter profile
          userId: selectedCandidate.userId,
          resumeId: "", // TODO: Get resume ID from search result
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Recruiter Portal</h1>
          <p className="text-gray-600 mt-2">
            Search candidates and request access to their contact information
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("search")}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === "search"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Search Candidates
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === "requests"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              My Requests
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
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

            {/* Request Form Modal */}
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

                  <form
                    onSubmit={handleSubmitRequest}
                    className="p-6 space-y-6"
                  >
                    {/* Candidate Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Requesting access from:
                      </h3>
                      <p className="text-lg font-medium text-gray-900">
                        {selectedCandidate.displayName}
                      </p>
                      {selectedCandidate.role && (
                        <p className="text-gray-600">
                          {selectedCandidate.role}
                        </p>
                      )}
                    </div>

                    {/* Fields Selection */}
                    <div>
                      <label className="block text-lg font-semibold text-gray-900 mb-3">
                        Which information would you like to access?
                      </label>
                      <div className="space-y-2">
                        {[
                          {
                            id: "email",
                            label: "Email Address",
                            description: "Primary contact email",
                          },
                          {
                            id: "phone",
                            label: "Phone Number",
                            description: "Primary phone number",
                          },
                          {
                            id: "address",
                            label: "Address",
                            description: "Current residential address",
                          },
                          {
                            id: "personalLinks",
                            label: "Personal Links",
                            description: "GitHub, Portfolio, LinkedIn, etc.",
                          },
                        ].map((field) => (
                          <label
                            key={field.id}
                            className="flex items-start p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={requestFormData.fields.includes(
                                field.id as any
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRequestFormData((prev) => ({
                                    ...prev,
                                    fields: [...prev.fields, field.id as any],
                                  }));
                                } else {
                                  setRequestFormData((prev) => ({
                                    ...prev,
                                    fields: prev.fields.filter(
                                      (f) => f !== field.id
                                    ),
                                  }));
                                }
                              }}
                              className="mt-1 mr-3"
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                {field.label}
                              </div>
                              <div className="text-sm text-gray-600">
                                {field.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Purpose */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Purpose of Request
                      </label>
                      <textarea
                        value={requestFormData.purpose}
                        onChange={(e) =>
                          setRequestFormData((prev) => ({
                            ...prev,
                            purpose: e.target.value,
                          }))
                        }
                        placeholder="e.g., Potential job opportunity, contract position..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={4}
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Proposed Duration
                      </label>
                      <select
                        value={requestFormData.duration}
                        onChange={(e) =>
                          setRequestFormData((prev) => ({
                            ...prev,
                            duration: e.target.value as any,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1hour">1 Hour</option>
                        <option value="1day">1 Day</option>
                        <option value="1week">1 Week</option>
                        <option value="30days">30 Days</option>
                      </select>
                    </div>

                    {/* Note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                      <strong>Note:</strong> Your request will be reviewed by
                      our team before the candidate is notified. This ensures
                      privacy and security for all users.
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setShowRequestForm(false)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          submitting || requestFormData.fields.length === 0
                        }
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {submitting ? "Submitting..." : "Submit Request"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "requests" && (
          <RequestManagement
            recruiterId={user.uid}
            onRequestSelect={(request: RecruiterContactRequest) => {
              // Handle request selection - could show detail view
              console.log("Selected request:", request);
            }}
          />
        )}
      </div>
    </div>
  );
}
