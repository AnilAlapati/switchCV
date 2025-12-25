"use client";

import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <BackgroundBlobs />
            </div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-900/60 font-medium animate-pulse">SwitchCV is preparing...</p>
            </div>
        </div>
    );
}
