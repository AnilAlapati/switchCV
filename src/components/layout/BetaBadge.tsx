"use client";

import React from "react";

export function BetaBadge() {
    return (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none select-none">
            <div className="group relative">
                {/* Glow Effect */}
                <div className="absolute -inset-0.5 animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 opacity-30 blur group-hover:opacity-50 transition duration-1000"></div>

                {/* Main Badge */}
                <div className="relative flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 backdrop-blur-md shadow-2xl transition hover:scale-105 active:scale-95 pointer-events-auto cursor-help">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500"></span>
                    </span>
                    <span className="text-xs font-bold tracking-widest text-white/90 uppercase">
                        Beta <span className="text-cyan-400 font-black">v1.2</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
