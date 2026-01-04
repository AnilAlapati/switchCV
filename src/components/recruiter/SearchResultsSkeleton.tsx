"use client";

import React from "react";

export function CandidateCardSkeleton() {
    return (
        <div className="glass-panel p-5 border border-[#2C4A3B]/10 animate-pulse">
            <div className="flex justify-between items-start mb-3">
                <div className="space-y-3 w-3/4">
                    <div className="h-6 w-48 bg-[#2C4A3B]/10 rounded"></div>
                    <div className="h-4 w-32 bg-[#2C4A3B]/5 rounded"></div>
                    <div className="h-4 w-40 bg-[#2C4A3B]/5 rounded"></div>
                </div>
                <div className="h-6 w-20 bg-[#2C4A3B]/5 rounded-full"></div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="h-4 w-full bg-[#2C4A3B]/5 rounded"></div>
                <div className="h-4 w-3/4 bg-[#2C4A3B]/5 rounded"></div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                <div className="h-6 w-20 bg-[#2C4A3B]/5 rounded-full"></div>
                <div className="h-6 w-24 bg-[#2C4A3B]/5 rounded-full"></div>
                <div className="h-6 w-16 bg-[#2C4A3B]/5 rounded-full"></div>
            </div>

            <div className="h-10 w-full bg-[#2C4A3B]/10 rounded-lg"></div>
        </div>
    );
}

export function SearchResultsSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-32 bg-[#2C4A3B]/10 rounded"></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <CandidateCardSkeleton />
                <CandidateCardSkeleton />
                <CandidateCardSkeleton />
                <CandidateCardSkeleton />
                <CandidateCardSkeleton />
            </div>
        </div>
    );
}
