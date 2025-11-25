"use client";

interface RecruiterPortalTabsProps {
  activeTab: "search" | "requests";
  onTabChange: (tab: "search" | "requests") => void;
}

export function RecruiterPortalTabs({
  activeTab,
  onTabChange,
}: RecruiterPortalTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6">
          <button
            onClick={() => onTabChange("search")}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "search"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Search Candidates
          </button>
          <button
            onClick={() => onTabChange("requests")}
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
  );
}
