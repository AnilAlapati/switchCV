"use client";

import * as React from "react";

interface TooltipProps {
    children: React.ReactNode;
    content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
    const [isVisible, setIsVisible] = React.useState(false);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#1A2F25] text-white text-xs rounded-lg whitespace-normal text-center w-max max-w-[260px] z-50 shadow-xl border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#1A2F25]" />
                </div>
            )}
        </div>
    );
}
