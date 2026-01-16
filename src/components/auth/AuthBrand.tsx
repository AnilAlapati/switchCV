"use client";


/**
 * Auth page branding component with SwitchCV logo
 * Matches the landing page header branding for consistency
 */
export function AuthBrand(): React.JSX.Element {
  return (
    <div className="flex flex-col items-center mb-8">
      {/* Horizontal Brand Container */}
      <div className="flex items-center gap-4 mb-3">
        {/* Logo Container */}
        <div className="relative w-10 h-10">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-[#2C4A3B] rounded-xl blur-lg opacity-30" />

          {/* Logo */}
          <div className="relative w-full h-full bg-gradient-to-br from-[#2C4A3B] to-[#1A2F25] rounded-xl flex items-center justify-center shadow-lg">
            {/* Arrow/Switch icon */}
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#1A2F25] tracking-tight">
            Switch<span className="text-[#2C4A3B]">CV</span>
          </h1>
          <span className="rounded-full bg-[#4ADE80]/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-[#2C4A3B]">
            Beta
          </span>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-[#2C4A3B]/60 text-sm font-medium">
        Autonomous Career Agent
      </p>
    </div>
  );
}
