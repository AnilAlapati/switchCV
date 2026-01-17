"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState, useEffect } from "react";

/**
 * Landing page header with SwitchCV branding
 * Features glass morphism design, responsive navigation, and scroll effects
 */
export function LandingHeader() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-[#2C4A3B]/5 border-b border-white/60"
                : "bg-transparent"
                }`}
        >
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo and Brand */}
                    <Link href="/" className="flex items-center gap-3 group">
                        {/* Logo Icon */}
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative w-10 h-10 md:w-12 md:h-12"
                        >
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-[#2C4A3B] rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />

                            {/* Logo container */}
                            <div className="relative w-full h-full bg-gradient-to-br from-[#2C4A3B] to-[#1A2F25] rounded-xl flex items-center justify-center shadow-lg">
                                {/* Arrow/Switch icon representing career switch */}
                                <svg
                                    className="w-5 h-5 md:w-6 md:h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                                    />
                                </svg>
                            </div>
                        </motion.div>

                        {/* Brand Name */}
                        <div className="flex flex-col">
                            <span className="text-xl md:text-2xl font-bold text-[#1A2F25] tracking-tight">
                                Switch<span className="text-[#2C4A3B]">CV</span>
                            </span>
                            <span className="text-[10px] md:text-xs font-medium text-[#2C4A3B]/60 uppercase tracking-widest -mt-0.5">
                                Autonomous Career Agent
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <NavLink href="#features">Features</NavLink>
                        <NavLink href="#how-it-works">How It Works</NavLink>
                        <NavLink href="#testimonials">Testimonials</NavLink>
                    </nav>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-4">
                        <Link
                            href="/auth"
                            className="text-[#1A2F25] font-semibold hover:text-[#2C4A3B] transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/auth?mode=signup"
                            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-white bg-[#2C4A3B] hover:bg-[#1A2F25] shadow-lg shadow-[#2C4A3B]/20 hover:shadow-[#2C4A3B]/30 transition-all active:scale-95"
                        >
                            Get Started
                            <svg
                                className="w-4 h-4 ml-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                            </svg>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-xl bg-white/40 backdrop-blur-sm border border-white/60"
                        aria-label="Toggle menu"
                    >
                        <svg
                            className="w-6 h-6 text-[#1A2F25]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                        >
                            {mobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden pb-6"
                    >
                        <div className="flex flex-col gap-4 pt-4 border-t border-white/40">
                            <MobileNavLink
                                href="#features"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Features
                            </MobileNavLink>
                            <MobileNavLink
                                href="#how-it-works"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                How It Works
                            </MobileNavLink>
                            <MobileNavLink
                                href="#testimonials"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Testimonials
                            </MobileNavLink>
                            <div className="flex flex-col gap-3 pt-4">
                                <Link
                                    href="/auth"
                                    className="text-center py-3 rounded-xl font-semibold text-[#1A2F25] bg-white/40 border border-white/60"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth?mode=signup"
                                    className="text-center py-3 rounded-xl font-bold text-white bg-[#2C4A3B] shadow-lg"
                                >
                                    Get Started Free
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.header>
    );
}

function NavLink({
    href,
    children,
}: {
    href: string;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <a
            href={href}
            className="relative text-[#1A2F25]/80 font-medium hover:text-[#1A2F25] transition-colors group"
        >
            {children}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#2C4A3B] group-hover:w-full transition-all duration-300" />
        </a>
    );
}

function MobileNavLink({
    href,
    children,
    onClick,
}: {
    href: string;
    children: React.ReactNode;
    onClick: () => void;
}): React.JSX.Element {
    return (
        <a
            href={href}
            onClick={onClick}
            className="text-[#1A2F25]/80 font-medium hover:text-[#1A2F25] transition-colors py-2"
        >
            {children}
        </a>
    );
}
