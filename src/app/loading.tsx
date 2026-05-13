"use client";

import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";

export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#FFFFF8]">
            <div className="fixed inset-0 z-0 pointer-events-none">
                <BackgroundBlobs />
            </div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin mb-4"></div>
                <p className="text-black/60 font-serif italic animate-pulse">SwitchCV is preparing...</p>
            </div>
        </div>
    );
}
