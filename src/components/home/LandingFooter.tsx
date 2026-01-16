"use client";

import Link from "next/link";

/**
 * Landing page footer with SwitchCV branding and links (Writer Theme)
 */
export function LandingFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative py-16 mt-16 border-t border-gray-200 bg-white">
            <div className="container mx-auto px-6">
                <div className="grid gap-12 md:grid-cols-4">
                    {/* Brand Column */}
                    <div className="md:col-span-2 space-y-4">
                        <Link href="/" className="flex items-center gap-3">
                            {/* Logo */}
                            <div className="w-10 h-10 bg-black flex items-center justify-center text-white font-serif font-bold text-xl">
                                S
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl font-serif font-bold text-black tracking-tight">
                                    SwitchCV.
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest -mt-0.5">
                                    The Career Agency
                                </span>
                            </div>
                        </Link>
                        <p className="text-sm text-gray-600 max-w-sm leading-relaxed font-sans">
                            Build AI-powered resumes with privacy controls and view tracking.
                            Take control of your career journey.
                        </p>
                    </div>

                    {/* Product Links */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-mono font-bold text-black uppercase tracking-widest">
                            Product
                        </h4>
                        <nav className="flex flex-col gap-2">
                            <FooterLink href="#features">Features</FooterLink>
                            <FooterLink href="#how-it-works">How It Works</FooterLink>
                            <FooterLink href="#testimonials">Testimonials</FooterLink>
                            <FooterLink href="/auth?mode=signup">Get Started</FooterLink>
                        </nav>
                    </div>

                    {/* Company Links */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-mono font-bold text-black uppercase tracking-widest">
                            Company
                        </h4>
                        <nav className="flex flex-col gap-2">
                            <FooterLink href="/auth">Sign In</FooterLink>
                            <FooterLink href="#">Privacy Policy</FooterLink>
                            <FooterLink href="#">Terms of Service</FooterLink>
                            <FooterLink href="#">Contact</FooterLink>
                        </nav>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-400 font-mono">
                        © {currentYear} SwitchCV. All rights reserved.
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-[10px] font-bold text-blue-700 font-mono uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            BETA v1.2
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({
    href,
    children,
}: {
    href: string;
    children: React.ReactNode;
}): React.JSX.Element {
    return (
        <a
            href={href}
            className="text-sm text-gray-500 hover:text-black transition-colors font-sans"
        >
            {children}
        </a>
    );
}
