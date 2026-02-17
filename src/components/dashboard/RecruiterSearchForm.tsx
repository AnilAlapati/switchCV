import { Dispatch, SetStateAction } from "react";
import { SearchModeSelector } from "./search/SearchModeSelector";
import { AiSearchInput } from "./search/AiSearchInput";
import { BasicLookupInput } from "./search/BasicLookupInput";
import { PremiumFiltersInput } from "./search/PremiumFiltersInput";

export interface SearchResult {
  resumeId: string;
  title: string;
  userName: string;
  userId: string;
  skills?: string[];
  location?: string;
  createdAt: string;
  accessStatus?: "none" | "pending" | "approved" | "denied";
  summary?: string; // AI-generated or profile summary
}

export type SearchModeType = "basic" | "premium" | "ai" | "jd";

interface RecruiterSearchFormProps {
  searchMode: SearchModeType;
  setSearchMode: Dispatch<SetStateAction<SearchModeType>>;
  premiumFiltersEnabled: boolean;
  aiSearchEnabled: boolean;
  userId: string;
  setUserId: Dispatch<SetStateAction<string>>;
  skills: string[];
  location: string;
  setLocation: Dispatch<SetStateAction<string>>;
  loading: boolean;
  onSearch: (e: React.FormEvent) => Promise<void>;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (index: number) => void;
  searchResults: SearchResult[];
  setSearchResults: Dispatch<SetStateAction<SearchResult[]>>;
  setSearched: Dispatch<SetStateAction<boolean>>;
  // AI search props
  aiQuery?: string;
  setAiQuery?: Dispatch<SetStateAction<string>>;
  onAiSearch?: () => Promise<void>;
  aiSearching?: boolean;
  aiError?: string | null;
  aiQuota?: { remaining: number; limit: number } | null;
}

export function RecruiterSearchForm({
  searchMode,
  setSearchMode,
  premiumFiltersEnabled,
  aiSearchEnabled,
  userId,
  setUserId,
  skills,
  location,
  setLocation,
  loading,
  onSearch,
  onAddSkill,
  onRemoveSkill,
  setSearchResults,
  setSearched,
  aiQuery = "",
  setAiQuery,
  onAiSearch,
  aiSearching = false,
  aiError = null,
  aiQuota = null,
}: RecruiterSearchFormProps) {
  const resetSearchState = () => {
    setSearchResults([]);
    setSearched(false);
  };

  const handleModeSwitch = (mode: SearchModeType) => {
    if (!premiumFiltersEnabled && mode === "premium") {
      return;
    }
    if (!aiSearchEnabled && mode === "ai") {
      return;
    }
    setSearchMode(mode);
    resetSearchState();
  };

  return (
    <div className="space-y-6">
      <SearchModeSelector
        searchMode={searchMode}
        handleModeSwitch={handleModeSwitch}
        aiSearchEnabled={aiSearchEnabled}
        premiumFiltersEnabled={premiumFiltersEnabled}
      />

      <div className="space-y-5">
        {searchMode === "ai" && setAiQuery && onAiSearch ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onAiSearch?.();
            }}
          >
            <AiSearchInput
              aiQuery={aiQuery}
              setAiQuery={setAiQuery}
              onAiSearch={onAiSearch}
              aiSearching={aiSearching}
              aiError={aiError}
              aiQuota={aiQuota}
              loading={loading}
            />
          </form>
        ) : searchMode === "basic" ? (
          <form onSubmit={onSearch}>
            <BasicLookupInput
              userId={userId}
              setUserId={setUserId}
              loading={loading}
            />
          </form>
        ) : searchMode === "premium" ? (
          <form onSubmit={onSearch}>
            <PremiumFiltersInput
              skills={skills}
              onAddSkill={onAddSkill}
              onRemoveSkill={onRemoveSkill}
              location={location}
              setLocation={setLocation}
              loading={loading}
            />
          </form>
        ) : null}
      </div>
    </div>
  );
}
