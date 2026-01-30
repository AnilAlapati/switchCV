"use client";

import { useState, useCallback } from "react";
import { Search, FileText } from "lucide-react";
import { SearchForm } from "@/components/recruiter/SearchForm";
import {
    SearchResults,
    type SearchResult,
} from "@/components/recruiter/SearchResults";
import { JDUpload, type ParsedJDPreview } from "@/components/recruiter/JDUpload";

export interface RecruiterSearchFilters {
    query: string;
    location?: string;
    skills?: string[];
    targetRole?: string;
    sortBy: "relevance" | "recentlyActive" | "connections";
}

export type SearchMode = "text" | "jd";

interface UnifiedSearchProps {
    /** Handler for text-based search */
    onTextSearch: (filters: RecruiterSearchFilters) => Promise<void>;
    /** Handler for JD-based search */
    onJDSearch: (jdText: string, useAI: boolean) => Promise<void>;
    /** Search results to display */
    results: SearchResult[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Parsed JD preview (for JD search mode) */
    parsedJD?: ParsedJDPreview | null;
    /** Handler for when a candidate is selected */
    onSelectCandidate?: (userId: string, result: SearchResult) => void;
    /** Initial search mode */
    initialMode?: SearchMode;
}

/**
 * Unified search interface with tabs for text search and JD upload
 */
export function UnifiedSearch({
    onTextSearch,
    onJDSearch,
    results,
    isLoading,
    error,
    parsedJD,
    onSelectCandidate,
    initialMode = "text",
}: UnifiedSearchProps) {
    const [mode, setMode] = useState<SearchMode>(initialMode);
    const [query, setQuery] = useState("");
    const [location, setLocation] = useState("");
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [targetRole, setTargetRole] = useState("");
    const [sortBy, setSortBy] = useState<"relevance" | "recentlyActive" | "connections">("relevance");
    const [showFilters, setShowFilters] = useState(false);

    const handleTextSearch = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            await onTextSearch({
                query,
                location: location || undefined,
                skills: selectedSkills.length > 0 ? selectedSkills : undefined,
                targetRole: targetRole || undefined,
                sortBy,
            });
        },
        [query, location, selectedSkills, targetRole, sortBy, onTextSearch]
    );

    const toggleSkill = (skill: string) => {
        setSelectedSkills((prev) =>
            prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
        );
    };

    return (
        <div className="space-y-6">
            {/* Search Mode Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => setMode("text")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "text"
                            ? "bg-white text-black shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                    data-testid="search-tab-text"
                >
                    <Search className="w-4 h-4" />
                    Search by Keywords
                </button>
                <button
                    type="button"
                    onClick={() => setMode("jd")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === "jd"
                            ? "bg-white text-black shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                    data-testid="search-tab-jd"
                >
                    <FileText className="w-4 h-4" />
                    Upload Job Description
                </button>
            </div>

            {/* Text Search Mode */}
            {mode === "text" && (
                <div className="space-y-6">
                    <SearchForm
                        query={query}
                        location={location}
                        selectedSkills={selectedSkills}
                        targetRole={targetRole}
                        sortBy={sortBy}
                        showFilters={showFilters}
                        isLoading={isLoading}
                        onQueryChange={setQuery}
                        onLocationChange={setLocation}
                        onSkillToggle={toggleSkill}
                        onTargetRoleChange={setTargetRole}
                        onSortChange={setSortBy}
                        onFiltersToggle={() => setShowFilters(!showFilters)}
                        onSearch={handleTextSearch}
                    />

                    {/* Active Filters Badges */}
                    {(location || selectedSkills.length > 0 || targetRole) && (
                        <div className="flex flex-wrap gap-2">
                            {location && (
                                <FilterBadge label={`📍 ${location}`} onRemove={() => setLocation("")} />
                            )}
                            {selectedSkills.map((skill) => (
                                <FilterBadge
                                    key={skill}
                                    label={`🎯 ${skill}`}
                                    onRemove={() => toggleSkill(skill)}
                                />
                            ))}
                            {targetRole && (
                                <FilterBadge label={`💼 ${targetRole}`} onRemove={() => setTargetRole("")} />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* JD Upload Mode */}
            {mode === "jd" && (
                <JDUpload
                    onSearch={onJDSearch}
                    isLoading={isLoading}
                    parsedJD={parsedJD}
                    error={error}
                />
            )}

            {/* Error Display (for text search mode) */}
            {mode === "text" && error !== null && (
                <div className="glass-panel p-4 bg-red-50 border-2 border-red-500/20">
                    <div className="flex items-center gap-2 text-red-700">
                        <span className="text-xl">⚠️</span>
                        <span className="font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Search Results */}
            <SearchResults
                results={results}
                isLoading={isLoading}
                query={mode === "text" ? query : "Job Description Search"}
                onSelectCandidate={onSelectCandidate}
            />
        </div>
    );
}

/**
 * Filter badge component for active filters
 */
function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
            {label}
            <button onClick={onRemove} className="hover:text-emerald-900 ml-1">
                ✕
            </button>
        </div>
    );
}
