import React from "react";
import type { RecruiterContactRequest } from "@/types/profileSearch";

export default function RequestItem({
  item,
  selected,
  onClick,
}: {
  item: { id: string; request: RecruiterContactRequest };
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 hover:bg-gray-50 transition-colors border-l-4 ${
        selected ? "border-blue-600 bg-blue-50" : "border-transparent"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">
            {item.request.fromRecruiter.name}
          </h3>
          <p className="text-sm text-gray-600">
            {item.request.fromRecruiter.companyName}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {item.request.requestedFields.length} field
            {item.request.requestedFields.length !== 1 ? "s" : ""} requested
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">
            ⏳ Pending
          </div>
        </div>
      </div>
    </button>
  );
}
