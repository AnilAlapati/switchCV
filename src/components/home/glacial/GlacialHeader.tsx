"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

export function GlacialHeader() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? "bg-white/70 backdrop-blur-xl shadow-sm border-b border-white/50"
                : "bg-transparent"
                }`}
        >
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-slate-800 tracking-tight">
                            Switch<span className="text-blue-600">CV</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/auth"
                            className="text-slate-600 font-medium hover:text-blue-600 transition-colors text-sm"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/auth?mode=signup"
                            className="px-5 py-2.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-95 text-sm"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
