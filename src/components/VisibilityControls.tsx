// src/components/VisibilityControls.tsx
"use client";

import { Visibility } from "@/types";

interface VisibilityControlsProps {
  value: Visibility;
  onChange: (value: Visibility) => void;
  label?: string;
  showLabels?: boolean;
}

/**
 * VisibilityControls Component
 *
 * Provides UI for controlling field visibility settings.
 * - Public: Visible to everyone
 * - Masked: Hidden from view, can be requested
 * - Request: Requires recruiter request to access
 */
export const VisibilityControls = ({
  value,
  onChange,
  label = "Visibility",
  showLabels = true,
}: VisibilityControlsProps) => {
  const options: Array<{
    value: Visibility;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      value: "public",
      label: "Public",
      description: "Visible to everyone",
      icon: "🌍",
    },
    {
      value: "masked",
      label: "Masked",
      description: "Hidden from view",
      icon: "🔒",
    },
    {
      value: "request",
      label: "Request",
      description: "Requires request to access",
      icon: "🔑",
    },
  ];

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-gray-700">{label}</legend>

      <div className="flex flex-col sm:flex-row gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-center px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
              value === option.value
                ? "border-indigo-600 bg-indigo-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value as Visibility)}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="ml-3 flex items-center gap-2">
              <span className="text-lg">{option.icon}</span>
              <div>
                <div className="font-medium text-sm text-gray-900">
                  {option.label}
                </div>
                {showLabels && (
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                )}
              </div>
            </span>
          </label>
        ))}
      </div>

      {/* Info Box */}
      <div
        className={`mt-3 p-3 rounded-lg text-sm ${
          value === "public"
            ? "bg-green-50 text-green-800 border border-green-200"
            : value === "masked"
            ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
            : "bg-blue-50 text-blue-800 border border-blue-200"
        }`}
      >
        {value === "public" && (
          <p>
            <strong>ℹ️ Public:</strong> This field will be visible to all
            visitors of your resume.
          </p>
        )}
        {value === "masked" && (
          <p>
            <strong>ℹ️ Masked:</strong> This field is hidden by default but
            recruiters can request access.
          </p>
        )}
        {value === "request" && (
          <p>
            <strong>ℹ️ Request:</strong> Recruiters must submit a request and
            you must approve it to see this field.
          </p>
        )}
      </div>
    </fieldset>
  );
};

/**
 * VisibilityBadge Component
 *
 * Compact badge showing the current visibility status
 */
export const VisibilityBadge = ({ value }: { value: Visibility }) => {
  const styles = {
    public: "bg-green-100 text-green-800",
    masked: "bg-yellow-100 text-yellow-800",
    request: "bg-blue-100 text-blue-800",
  };

  const icons = {
    public: "🌍",
    masked: "🔒",
    request: "🔑",
  };

  const labels = {
    public: "Public",
    masked: "Masked",
    request: "Request",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${styles[value]}`}
    >
      <span>{icons[value]}</span>
      <span>{labels[value]}</span>
    </span>
  );
};

/**
 * VisibilityIndicator Component
 *
 * Shows visibility status with detailed information
 */
export const VisibilityIndicator = ({
  value,
  fieldName,
  compact = false,
}: {
  value: Visibility;
  fieldName: string;
  compact?: boolean;
}) => {
  const descriptions = {
    public: `${fieldName} is publicly visible on your resume.`,
    masked: `${fieldName} is hidden but can be requested by recruiters.`,
    request: `${fieldName} requires approval before recruiters can see it.`,
  };

  if (compact) {
    return <VisibilityBadge value={value} />;
  }

  return (
    <div className="flex items-start gap-2 text-sm text-gray-600">
      <span className="mt-0.5">ℹ️</span>
      <p>{descriptions[value]}</p>
    </div>
  );
};
