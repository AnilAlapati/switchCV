"use client";

export function AuthBrand() {
  return (
    <div className="text-center mb-8">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-white/40 p-3 rounded-2xl mb-4 backdrop-blur-sm shadow-sm">
          <svg
            className="w-8 h-8 text-[#2C4A3B]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#1A2F25] tracking-tight">SwitchCV</h1>
          <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-blue-600">
            Beta
          </span>
        </div>
      </div>
      <p className="text-slate-500 text-sm">Your AI-powered resume platform</p>
    </div>
  );
}
