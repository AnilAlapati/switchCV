// src/app/maintenance/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SwitchCV - Under Maintenance",
  description:
    "We're currently undergoing maintenance. Please check back soon.",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Static particles to avoid hydration mismatch and impure render errors */}
        <div
          className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-ping"
          style={{
            left: "10%",
            top: "20%",
            animationDelay: "0s",
            animationDuration: "3s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-ping"
          style={{
            left: "80%",
            top: "15%",
            animationDelay: "1s",
            animationDuration: "4s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-ping"
          style={{
            left: "30%",
            top: "70%",
            animationDelay: "2s",
            animationDuration: "2.5s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-ping"
          style={{
            left: "60%",
            top: "80%",
            animationDelay: "0.5s",
            animationDuration: "3.5s",
          }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-ping"
          style={{
            left: "90%",
            top: "40%",
            animationDelay: "1.5s",
            animationDuration: "4.5s",
          }}
        ></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-4">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl shadow-2xl shadow-cyan-500/25 mb-8">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
          Under Maintenance
        </h1>

        <p className="text-xl text-slate-300 mb-8 max-w-md mx-auto leading-relaxed">
          We're upgrading SwitchCV to serve you better. We'll be back online
          soon!
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span>Maintenance in progress</span>
          </div>

          <p className="text-sm text-slate-500 mt-8">
            Have questions? Contact us at{" "}
            <a
              href="mailto:support@switchcv.com"
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              support@switchcv.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
