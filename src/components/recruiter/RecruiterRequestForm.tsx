"use client";

import { SearchResult } from "@/components/recruiter/SearchInterface";

interface RequestFormData {
  fields: Array<"email" | "phone" | "address" | "personalLinks">;
  purpose: string;
  duration: "1hour" | "1day" | "1week" | "30days";
}

const FIELD_OPTIONS = [
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
];

interface RecruiterRequestFormProps {
  candidate: SearchResult;
  formData: RequestFormData;
  onFormChange: (data: RequestFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function RecruiterRequestForm({
  candidate,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  isSubmitting,
}: RecruiterRequestFormProps) {
  return (
    <form onSubmit={onSubmit} className="p-6 space-y-6">
      {/* Candidate Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">
          Requesting access from:
        </h3>
        <p className="text-lg font-medium text-gray-900">
          {candidate.displayName}
        </p>
        {candidate.role && <p className="text-gray-600">{candidate.role}</p>}
      </div>

      {/* Fields Selection */}
      <div>
        <label className="block text-lg font-semibold text-gray-900 mb-3">
          Which information would you like to access?
        </label>
        <div className="space-y-2">
          {FIELD_OPTIONS.map((field) => (
            <label
              key={field.id}
              className="flex items-start p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={formData.fields.includes(field.id as "email" | "phone" | "address" | "personalLinks")}
                onChange={(e) => {
                  if (e.target.checked) {
                    onFormChange({
                      ...formData,
                      fields: [...formData.fields, field.id as "email" | "phone" | "address" | "personalLinks"],
                    });
                  } else {
                    onFormChange({
                      ...formData,
                      fields: formData.fields.filter((f) => f !== field.id),
                    });
                  }
                }}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium text-gray-900">{field.label}</div>
                <div className="text-sm text-gray-600">{field.description}</div>
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
          value={formData.purpose}
          onChange={(e) =>
            onFormChange({ ...formData, purpose: e.target.value })
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
          value={formData.duration}
          onChange={(e) =>
            onFormChange({
              ...formData,
              duration: e.target.value as "1hour" | "1day" | "1week" | "30days",
            })
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
        <strong>Note:</strong> Your request will be reviewed by our team before
        the candidate is notified. This ensures privacy and security for all
        users.
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || formData.fields.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
