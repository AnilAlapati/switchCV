"use client";

interface AuthFormInputsProps {
  email: string;
  password: string;
  username?: string;
  showUsername?: boolean;
  usernameError?: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onUsernameChange?: (username: string) => void;
}

export function AuthFormInputs({
  email,
  password,
  username = "",
  showUsername = false,
  usernameError,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
}: AuthFormInputsProps) {
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
              className={`w-full px-4 py-3 bg-slate-800/50 border ${
                usernameError ? "border-rose-500" : "border-slate-600"
              } rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm`}
              placeholder="e.g. avery-kim"
              value={username}
              onChange={(e) => onUsernameChange?.(e.target.value)}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
          </div>
          <p
            className={`mt-2 text-xs ${
              usernameError ? "text-rose-400" : "text-slate-400"
            }`}
          >
            {usernameError ||
              "Lowercase letters, numbers, hyphens, and underscores only."}
          </p>
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
