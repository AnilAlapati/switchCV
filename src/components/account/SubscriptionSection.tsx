"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";

export function SubscriptionSection(): ReactElement {
  const router = useRouter();

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300 mt-8">
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 pb-6">
          <div className="w-12 h-12 bg-black flex items-center justify-center text-white">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-black">Subscription</h2>
            <p className="text-gray-500 text-sm font-sans">
              Manage your billing and plan details
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 bg-gray-50 border-2 border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-black text-lg">Free Plan</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                Active
              </span>
            </div>
            <p className="text-sm text-gray-600 font-sans">
              Basic features for job seekers
            </p>
          </div>
          <button
            onClick={() => router.push("/profile/subscription")}
            className="px-5 py-2.5 bg-black text-white text-sm font-bold border-2 border-black hover:bg-white hover:text-black transition-all"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}
