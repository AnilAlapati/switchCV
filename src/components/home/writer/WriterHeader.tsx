"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

export function WriterHeader() {
    const [isVisible, setIsVisible] = useState(true);

    // Hide header on scroll down, show on scroll up (classic editorial feel)
    useEffect(() => {
        let lastScrollY = window.scrollY;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > 100) {
                setIsVisible(currentScrollY < lastScrollY);
            } else {
                setIsVisible(true);
            }
            lastScrollY = currentScrollY;
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: 0 }}
            animate={{ y: isVisible ? 0 : -100 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed top-0 left-0 right-0 z-50 bg-[#FFFFF8] border-b border-black md:bg-[#FFFFF8]/90 md:backdrop-blur-sm"
        >
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-20">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-serif font-bold text-lg group-hover:bg-blue-600 transition-colors">
                            S
                        </div>
                        <span className="text-xl font-serif font-bold text-black tracking-tight group-hover:text-blue-600 transition-colors">
                            SwitchCV.
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8 font-sans text-sm font-medium tracking-wide">
                        <a href="#features" className="hover:text-blue-600 hover:underline hover:decoration-2 hover:underline-offset-4 transition-all">Features</a>
                    </nav>

                    <div className="flex items-center gap-3 md:gap-6">
                        <Link
                            href="/auth"
                            className="text-black font-sans font-medium hover:text-blue-600 text-sm italic whitespace-nowrap"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/auth?mode=signup"
                            className="px-4 py-2 md:px-6 md:py-3 bg-black text-white font-sans font-bold text-xs md:text-sm tracking-wide hover:bg-blue-600 transition-colors whitespace-nowrap"
                        >
                            Generate First CV
                        </Link>
                    </div>
                </div>
            </div>
        </motion.header>
    );
}
