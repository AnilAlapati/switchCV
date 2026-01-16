"use client";

import React from "react";
import Link from "next/link";

export const MaintenancePage = (): React.JSX.Element => {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center px-4 font-serif text-black">
      {/* Main Content */}
      <div className="max-w-2xl text-center space-y-8">
        {/* Logo/Brand */}
        <div className="border-b-2 border-black pb-4 mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold tracking-tight">SwitchCV</span>
          </Link>
        </div>

        {/* Edition Line */}
        <div className="flex items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] text-gray-500">
          <span className="font-bold text-black">Vol. 1</span>
          <span>·</span>
          <span>Maintenance Edition</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-normal leading-[0.9] tracking-tighter">
          We&apos;ll be
          <br />
          right back.
        </h1>

        {/* Description */}
        <p className="text-xl text-gray-600 font-light leading-relaxed max-w-lg mx-auto font-sans">
          We&apos;re making improvements to serve you better. Our team is working to restore service.
        </p>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-3 py-6 border-y border-black/10">
          <span className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-sm font-medium uppercase tracking-wider">Maintenance in progress</span>
        </div>

        {/* Contact */}
        <div className="pt-8 space-y-4">
          <p className="text-sm text-gray-500">
            Have questions? Reach out to us.
          </p>
          <a
            href="mailto:support@switchcv.com"
            className="inline-flex items-center justify-center px-6 py-3 bg-black text-white border border-black hover:bg-white hover:text-black transition-colors text-sm font-medium tracking-wide"
          >
            Contact Support
          </a>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 pt-8">
          Thank you for your patience.
        </p>
      </div>
    </div>
  );
};
