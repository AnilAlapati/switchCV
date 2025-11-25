// src/components/recruiter/RequestTabs.tsx
type RequestStatus = "pending" | "approved" | "denied" | "expired";

interface RequestTabsProps {
  activeTab: RequestStatus;
  onTabChange: (tab: RequestStatus) => void;
  stats: {
    pending: number;
    approved: number;
    denied: number;
    expired: number;
  };
}

export function RequestTabs({
  activeTab,
  onTabChange,
  stats,
}: RequestTabsProps) {
  const statusConfig = {
    pending: {
      badge: "bg-yellow-100 text-yellow-800",
      title: "Pending Approval",
    },
    approved: { badge: "bg-green-100 text-green-800", title: "Approved" },
    denied: { badge: "bg-red-100 text-red-800", title: "Denied" },
    expired: { badge: "bg-gray-100 text-gray-800", title: "Expired" },
  };

  return (
    <div className="border-b border-gray-200 flex gap-4">
      {(["pending", "approved", "denied", "expired"] as RequestStatus[]).map(
        (status) => (
          <button
            key={status}
            onClick={() => onTabChange(status)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === status
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {statusConfig[status].title}
            {stats[status] > 0 && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${statusConfig[status].badge}`}
              >
                {stats[status]}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}
