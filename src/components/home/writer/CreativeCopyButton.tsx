"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function CreativeCopyButton({ text }: { text: string }) {
    const [status, setStatus] = useState<"idle" | "copied">("idle");

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setStatus("copied");
        setTimeout(() => setStatus("idle"), 2500);
    };

    return (
        <button
            onClick={handleCopy}
            className="group relative flex items-center justify-center p-2 rounded-lg bg-white border border-gray-200 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
            <div className="relative w-5 h-5 overflow-hidden">
                <AnimatePresence mode="wait">
                    {status === "idle" ? (
                        <motion.svg
                            key="copy-icon"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5 text-gray-400 group-hover:text-blue-600"
                        >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </motion.svg>
                    ) : (
                        <motion.svg
                            key="check-icon"
                            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-5 h-5 text-green-500"
                        >
                            <path d="M20 6 9 17l-5-5" />
                        </motion.svg>
                    )}
                </AnimatePresence>
            </div>

            {/* Tooltip-like expansion Effect */}
            <span className="sr-only">Copy Link</span>

            {/* Creative Ripple / Sparkle Effect on Click */}
            {status === "copied" && (
                <>
                    <motion.div
                        layoutId="sparkle-1"
                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                        animate={{ opacity: 0, scale: 2, x: 10, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="absolute w-1 h-1 bg-green-400 rounded-full top-0 right-0 pointer-events-none"
                    />
                    <motion.div
                        layoutId="sparkle-2"
                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                        animate={{ opacity: 0, scale: 2, x: -10, y: -10 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="absolute w-1 h-1 bg-blue-400 rounded-full top-0 left-0 pointer-events-none"
                    />
                    <motion.div
                        layoutId="sparkle-3"
                        initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                        animate={{ opacity: 0, scale: 2, x: 0, y: 10 }}
                        transition={{ duration: 0.5, delay: 0.05 }}
                        className="absolute w-1 h-1 bg-yellow-400 rounded-full bottom-0 left-1/2 pointer-events-none"
                    />
                </>
            )}
        </button>
    );
}
