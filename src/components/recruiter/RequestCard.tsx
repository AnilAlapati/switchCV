// src/components/recruiter/RequestCard.tsx
import { RecruiterContactRequest } from "@/types/profileSearch";

type RequestStatus = "pending" | "approved" | "denied" | "expired";

interface RequestCardProps {
  request: RecruiterContactRequest;
  status: RequestStatus;
  onSelect: () => void;
}

export function RequestCard({ request, status, onSelect }: RequestCardProps) {
  const statusConfig = {
    pending: { badge: "bg-yellow-100 text-yellow-800", icon: "⏳" },
    approved: { badge: "bg-green-100 text-green-800", icon: "✅" },
    denied: { badge: "bg-red-100 text-red-800", icon: "❌" },
    expired: { badge: "bg-gray-100 text-gray-800", icon: "⏰" },
  };

  const config = statusConfig[status];
  const createdDate = new Date(request.createdAt);

  // Calculate days ago safely for hydration
  const daysAgo = Math.floor(
    (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">
              {request.toUserEmail || "Unknown Candidate"}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded font-medium ${config.badge}`}
            >
              {config.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Resume: {request.resumeTitle || "Untitled"}
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {daysAgo === 0 ? "Today" : `${daysAgo}d ago`}
        </div>
      </div>

      {request.purpose && (
        <p className="text-sm text-gray-700 mb-3 italic">"{request.purpose}"</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          Duration: {request.proposedDuration}
        </span>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          Fields: {request.requestedFields.join(", ")}
        </span>
      </div>

      {request.denialReason && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Reason:</strong> {request.denialReason}
        </div>
      )}

      {request.accessExpiresAt && status === "approved" && (
        <div className="mb-3 text-sm text-gray-700">
          <strong>Access expires:</strong>{" "}
          {new Date(request.accessExpiresAt).toLocaleDateString()}
        </div>
      )}

      <button
        onClick={onSelect}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        View Details
      </button>
    </div>
  );
}
