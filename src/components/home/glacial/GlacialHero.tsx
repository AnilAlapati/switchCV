import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
// Using fixed strings instead of translations for the variant to ensure it works without complex setup
// or we can reuse existing keys if they map well. For now, I'll accept props or hardcode based on HomeHero.

interface HeroStats {
    resumes: string;
    jobSeekers: string;
    recruiters: string;
}

interface HeroHighlight {
    title: string;
    description: string;
}

interface GlacialHeroProps {
    stats: HeroStats;
    highlights: HeroHighlight[];
}

const CREATION_STEPS = [
    {
        title: "Strategic Consultation",
        description: "Describe your experience or goals and let your agent plan the narrative.",
        accent: "from-blue-500/20 to-transparent",
    },
    {
        title: "Agentic Optimization",
        description: "Your agent refines every detail for clarity, metrics, and industry impact.",
        accent: "from-cyan-500/20 to-transparent",
    },
    {
        title: "Share securely",
        description: "Publish a unique link and track when your resume is viewed.",
        accent: "from-sky-500/20 to-transparent",
    },
];

export function GlacialHero({ stats, highlights }: GlacialHeroProps) {
    const containerRef = useRef(null);
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, -100]);
    const y2 = useTransform(scrollY, [0, 500], [0, -50]);
    const rotate = useTransform(scrollY, [0, 500], [1, -2]);

    return (
        <section
            ref={containerRef}
            className="flex flex-col lg:flex-row gap-16 items-center relative z-10"
        >
            <motion.div className="flex-1 space-y-6">
                {/* Brand tagline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className="flex items-center gap-3"
                >
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100/50 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-sm font-bold text-blue-900">SwitchCV</span>
                    </span>
                    <span className="text-sm text-slate-400 font-medium tracking-wide">
                        Autonomous Career Agent
                    </span>
                </motion.div>

                <h1 className="text-5xl sm:text-6xl xl:text-7xl font-light leading-[1.1] text-slate-900 tracking-tight">
                    Design your career <br />
                    <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                        with intelligence.
                    </span>
                </h1>

                <p className="text-xl text-slate-500 max-w-2xl leading-relaxed font-light">
                    An AI-powered partner that crafts, optimizes, and hosts your professional story.
                    Stand out with resumes that are visually stunning and algorithmically perfect.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link
                        href="/auth?mode=signup"
                        className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Start for free
                    </Link>
                    <Link
                        href="/auth"
                        className="inline-flex items-center justify-center bg-white/60 border border-blue-100 text-slate-600 px-8 py-4 rounded-xl font-medium hover:bg-white/80 transition-colors backdrop-blur-md"
                    >
                        Sign in
                    </Link>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-10">
                    {highlights.map((item, idx) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-5 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-md shadow-sm hover:shadow-lg hover:shadow-blue-900/5 transition-all"
                        >
                            <p className="text-sm font-bold text-slate-700">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                {item.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-8 border-t border-blue-100/50">
                    <GlacialStat label="Resumes" value={stats.resumes} delay={0.6} />
                    <GlacialStat label="Job Seekers" value={stats.jobSeekers} delay={0.7} />
                    <GlacialStat label="Recruiters" value={stats.recruiters} delay={0.8} />
                </div>
            </motion.div>

            <motion.div style={{ y: y2 }} className="flex-1 w-full relative">
                {/* Glass Card Container */}
                <motion.div
                    style={{ rotate }}
                    whileHover={{ rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative bg-white/40 rounded-[2rem] border border-white/60 p-8 shadow-[0_30px_60px_-15px_rgba(30,58,138,0.1)] backdrop-blur-2xl space-y-8"
                >
                    {/* Header of Card */}
                    <div className="flex items-center justify-between border-b border-white/50 pb-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 font-mono">
                                Live Preview
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="px-3 py-1 rounded bg-blue-50/50 border border-blue-100 text-blue-600 text-xs font-mono">
                                    switchcv.com/resumes/anil
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-white flex items-center justify-center text-blue-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-white to-blue-50/30 rounded-2xl border border-white">
                        <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3">
                            Zero Entropy Theme
                        </p>
                        <div className="space-y-2">
                            <p className="text-3xl font-light text-slate-800 tracking-tight">
                                Anil Alapati
                            </p>
                            <p className="text-blue-600/80 text-sm font-medium uppercase tracking-wide">
                                Senior LLM Engineer
                            </p>
                            <p className="text-slate-500 text-sm leading-relaxed pt-2">
                                Architecting scalable AI solutions. Scaled design systems across three platforms.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {CREATION_STEPS.map((step, idx) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1 + idx * 0.1 }}
                                className="flex items-start gap-4 group cursor-default"
                            >
                                <div className="w-8 h-8 rounded-full bg-white border border-blue-50 flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 group-hover:scale-110">
                                    <div className="text-xs font-bold">{idx + 1}</div>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                                        {step.title}
                                    </p>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Decorative elements */}
                <motion.div
                    style={{ y: y1 }}
                    className="absolute -top-12 -right-12 w-64 h-64 bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"
                />
                <motion.div
                    style={{ y: y2 }}
                    className="absolute -bottom-8 -left-8 w-64 h-64 bg-cyan-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"
                />
            </motion.div>
        </section>
    );
}

function GlacialStat({ label, value, delay }: { label: string; value: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="space-y-1"
        >
            <p className="text-3xl font-light text-slate-800 tracking-tighter">
                {value}
            </p>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                {label}
            </p>
        </motion.div>
    );
}
