"use client";

import { useState, useEffect } from "react";
import { Monitor, X } from "lucide-react";

/**
 * A dismissible banner shown only on mobile/tablet devices
 * recommending desktop for the best experience.
 * Matches the "Writer" editorial design theme.
 */
export function MobileNotice() {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if already dismissed this session
        const dismissed = sessionStorage.getItem("mobile-notice-dismissed");
        if (dismissed) {
            // eslint-disable-next-line
            setIsDismissed(true);
            return;
        }

        // Check if mobile/tablet (< 1024px)
        const checkDevice = () => {
            const isMobileOrTablet = window.innerWidth < 1024;
            setIsVisible(isMobileOrTablet);
        };

        checkDevice();
        window.addEventListener("resize", checkDevice);
        return () => window.removeEventListener("resize", checkDevice);
    }, []);

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem("mobile-notice-dismissed", "true");
    };

    if (!isVisible || isDismissed) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:hidden print:hidden">
            <div className="mx-auto max-w-lg bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 relative">
                {/* Dismiss button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-black transition-colors"
                    aria-label="Dismiss notice"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-start gap-4 pr-8">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-black text-white flex items-center justify-center">
                        <Monitor className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                        <p className="font-serif font-bold text-black text-sm">
                            Best on Desktop
                        </p>
                        <p className="text-xs text-gray-600 font-sans leading-relaxed">
                            SwitchCV is optimized for laptop and desktop. For the best
                            experience, please switch to a larger screen.
                        </p>
                    </div>
                </div>

                {/* Decorative top line */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-600" />
            </div>
        </div>
    );
}
