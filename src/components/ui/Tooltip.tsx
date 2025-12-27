"use client";

import * as React from "react";

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ children, content, position = "top" }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-foreground",
    bottom:
      "absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-foreground",
    left: "absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-foreground",
    right:
      "absolute right-full top-1/2 -translate-y-1/2 -mr-1 border-4 border-transparent border-r-foreground",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute ${positionClasses[position]} px-4 py-2 bg-foreground text-white text-xs font-medium rounded-lg whitespace-normal leading-relaxed w-max max-w-[240px] z-[9999] shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-200`}
          style={{
            pointerEvents: "none",
            wordBreak: "normal",
            hyphens: "auto",
          }}
        >
          {content}
          <div className={arrowClasses[position]} />
        </div>
      )}
    </div>
  );
}
