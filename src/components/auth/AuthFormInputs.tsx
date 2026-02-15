"use client";

type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid"
  | "error";

interface AuthFormInputsProps {
  email: string;
  password: string;
  username?: string;
  showUsername?: boolean;
  usernameError?: string;
  usernameStatus?: UsernameStatus;
  isCheckingUsername?: boolean;
  usernameSuggestion?: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onUsernameChange?: (username: string) => void;
  onUseSuggestion?: () => void;
}

function UsernameStatusIcon({
  status,
  isChecking,
}: {
  status: UsernameStatus;
  isChecking: boolean;
}) {
  if (isChecking || status === "checking") {
    return (
      <svg
        aria-hidden="true"
        className="w-5 h-5 text-slate-400 animate-spin"
        role="status"
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
        aria-hidden="true"
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
        aria-hidden="true"
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

export function AuthFormInputs({
  email,
  password,
  username = "",
  showUsername = false,
  usernameError,
  usernameStatus = "idle",
  isCheckingUsername = false,
  usernameSuggestion,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
  onUseSuggestion,
}: AuthFormInputsProps) {
  const getStatusMessage = () => {
    if (usernameError) return usernameError;
    if (usernameStatus === "available") return "✓ Username is available!";
    if (usernameStatus === "checking" || isCheckingUsername)
      return "Checking availability...";
    return "Lowercase letters, numbers, hyphens, and underscores only.";
  };

  const getMessageColor = () => {
    if (
      usernameError ||
      usernameStatus === "taken" ||
      usernameStatus === "invalid"
    ) {
      return "text-rose-600";
    }
    if (usernameStatus === "available") {
      return "text-emerald-600";
    }
    if (usernameStatus === "checking" || isCheckingUsername) {
      return "text-slate-500";
    }
    return "text-[#1A2F25]/60";
  };

  return (
    <>
      {showUsername && (
        <div className="relative">
          <label
            htmlFor="username"
            className="block text-sm font-bold text-[#1A2F25] mb-2"
          >
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={30}
              autoComplete="username"
              aria-invalid={
                !!(
                  usernameError ||
                  usernameStatus === "taken" ||
                  usernameStatus === "invalid"
                )
              }
              aria-describedby="username-status"
              className={`w-full px-4 py-3 pr-12 glass-input rounded-xl text-[#1A2F25] placeholder-[#2C4A3B]/40 focus:outline-none focus:ring-4 transition-all duration-200 ${usernameError || usernameStatus === "taken"
                ? "border-rose-500/50"
                : ""
                }`}
              placeholder="e.g. avery-kim"
              value={username}
              onChange={(e) => onUsernameChange?.(e.target.value.toLowerCase())}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <UsernameStatusIcon
                status={usernameStatus}
                isChecking={isCheckingUsername}
              />
            </div>
            {/* Removed gradient overlay */}
          </div>
          <p
            id="username-status"
            className={`mt-2 text-xs ${getMessageColor()}`}
            role={
              usernameError ||
                usernameStatus === "taken" ||
                usernameStatus === "invalid"
                ? "alert"
                : undefined
            }
          >
            {getStatusMessage()}
          </p>
          {usernameSuggestion &&
            usernameStatus === "taken" &&
            onUseSuggestion && (
              <button
                type="button"
                onClick={onUseSuggestion}
                className="mt-1 text-xs text-blue-600 hover:text-blue-500 underline transition-colors"
              >
                Try @{usernameSuggestion} instead?
              </button>
            )}
        </div>
      )}

      {/* Email Input */}
      <div className="relative">
        <label
          htmlFor="email"
          className="block text-sm font-bold text-[#1A2F25] mb-2"
        >
          Email Address
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            aria-describedby="email-hint"
            className="w-full px-4 py-3 glass-input rounded-xl focus:ring-4 focus:ring-[#2C4A3B]/10 transition-all duration-200"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <span id="email-hint" className="sr-only">
            Enter your email address
          </span>
        </div>
      </div>

      {/* Password Input */}
      <div className="relative">
        <label
          htmlFor="password"
          className="block text-sm font-bold text-slate-700 mb-2"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type="password"
            required
            aria-describedby="password-hint"
            className="w-full px-4 py-3 glass-input rounded-xl focus:ring-4 focus:ring-[#2C4A3B]/10 transition-all duration-200"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          <span id="password-hint" className="sr-only">
            Enter your password
          </span>
        </div>
      </div>
    </>
  );
}
