"use client";

/**
 * Username Input Component with availability status indicator
 */

import { USERNAME_CONFIG } from "@/config/constants";

type AvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  status: AvailabilityStatus;
  isPending: boolean;
  message: string;
  suggestion: string;
  disabled: boolean;
  onUseSuggestion: () => void;
}

function StatusIcon({
  status,
  isPending,
}: {
  status: AvailabilityStatus;
  isPending: boolean;
}) {
  if (isPending || status === "checking") {
    return (
      <svg
        className="w-5 h-5 text-gray-400 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }
  if (status === "available") {
    return (
      <svg
        className="w-5 h-5 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    );
  }
  if (status === "taken" || status === "invalid") {
    return (
      <svg
        className="w-5 h-5 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    );
  }
  return null;
}

export function UsernameInput({
  value,
  onChange,
  status,
  isPending,
  message,
  suggestion,
  disabled,
  onUseSuggestion,
}: UsernameInputProps) {
  const borderColor =
    status === "available"
      ? "border-green-500"
      : status === "taken" || status === "invalid"
      ? "border-red-500"
      : "border-gray-300";

  const messageColor =
    status === "available"
      ? "text-green-600"
      : status === "error"
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <div className="mb-6">
      <label
        htmlFor="username"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Username
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          @
        </span>
        <input
          id="username"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          placeholder="yourname"
          className={`w-full pl-8 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${borderColor}`}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <StatusIcon status={status} isPending={isPending} />
        </div>
      </div>

      {message && <p className={`mt-2 text-sm ${messageColor}`}>{message}</p>}

      {suggestion && status === "taken" && (
        <button
          type="button"
          onClick={onUseSuggestion}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Try @{suggestion} instead?
        </button>
      )}

      <p className="mt-2 text-xs text-gray-500">
        {USERNAME_CONFIG.MIN_LENGTH}-{USERNAME_CONFIG.MAX_LENGTH} characters.
        Letters, numbers, hyphens, and underscores only.
      </p>
    </div>
  );
}
