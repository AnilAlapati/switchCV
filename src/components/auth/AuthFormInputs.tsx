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
        className="w-5 h-5 text-slate-400 animate-spin"
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
  const getBorderColor = () => {
    if (
      usernameError ||
      usernameStatus === "taken" ||
      usernameStatus === "invalid"
    ) {
      return "border-rose-500";
    }
    if (usernameStatus === "available") {
      return "border-green-500";
    }
    return "border-slate-600";
  };

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
      return "text-rose-400";
    }
    if (usernameStatus === "available") {
      return "text-green-400";
    }
    if (usernameStatus === "checking" || isCheckingUsername) {
      return "text-slate-400";
    }
    return "text-slate-400";
  };

  return (
    <>
      {showUsername && (
        <div className="relative">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-slate-300 mb-2"
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
              className={`w-full px-4 py-3 pr-12 bg-slate-800/50 border ${getBorderColor()} rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm`}
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
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          </div>
          <p className={`mt-2 text-xs ${getMessageColor()}`}>
            {getStatusMessage()}
          </p>
          {usernameSuggestion &&
            usernameStatus === "taken" &&
            onUseSuggestion && (
              <button
                type="button"
                onClick={onUseSuggestion}
                className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 underline transition-colors"
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
          className="block text-sm font-medium text-slate-300 mb-2"
        >
          Email Address
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
        </div>
      </div>

      {/* Password Input */}
      <div className="relative">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-300 mb-2"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
        </div>
      </div>
    </>
  );
}
