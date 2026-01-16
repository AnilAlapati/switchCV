"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface HeroStats {
    resumes: string;
    jobSeekers: string;
    recruiters: string;
}

interface HeroHighlight {
    title: string;
    description: string;
}

interface WriterHeroProps {
    stats: HeroStats;
    highlights: HeroHighlight[];
}

// CREATION_STEPS moved to commented for potential future use

export function WriterHero({ stats }: WriterHeroProps) {
    const [typedTitle, setTypedTitle] = useState("");
    const fullTitle = "Write your future.";

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            if (index <= fullTitle.length) {
                setTypedTitle(fullTitle.slice(0, index));
                index++;
            } else {
                clearInterval(interval);
            }
        }, 150);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="flex flex-col lg:flex-row gap-20 items-start relative z-10 font-serif text-black">
            <motion.div className="flex-1 space-y-10">
                {/* Date/Edition Line */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-4 border-b border-black pb-4"
                >
                    <span className="text-xs uppercase tracking-[0.2em] font-bold">Vol. 1</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-gray-500">The Career Edition</span>
                </motion.div>

                <div className="min-h-[160px]">
                    <h1 className="text-6xl sm:text-7xl lg:text-8xl font-normal leading-[0.9] tracking-tighter">
                        {typedTitle}
                        <span className="inline-block w-4 h-[0.7em] bg-blue-600 ml-2 animate-pulse align-baseline" />
                    </h1>
                </div>

                <p className="text-2xl text-gray-600 font-light leading-relaxed max-w-xl font-sans">
                    An intelligent agent that transforms your professional experience into a compelling narrative.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 pt-4">
                    <Link
                        href="/auth?mode=signup"
                        className="group relative inline-flex items-center justify-start overflow-hidden px-8 py-4 bg-black text-white transition-all hover:bg-white hover:text-black border border-black"
                    >
                        <span className="relative text-lg font-medium tracking-wide">Start Writing</span>
                        <div className="absolute inset-0 bg-white transform translate-x-full group-hover:translate-x-0 transition-transform duration-300 mix-blend-difference"></div>
                    </Link>
                    <Link
                        href="/auth"
                        className="inline-flex items-center justify-center text-black border-b border-black px-4 py-4 hover:border-blue-600 hover:text-blue-600 transition-colors"
                    >
                        <span className="text-lg font-medium">Continue Draft</span>
                    </Link>
                </div>

                <div className="grid grid-cols-3 gap-8 pt-12 border-t border-black/10">
                    <WriterStat label="Resumes" value={stats.resumes} delay={0.6} />
                    <WriterStat label="Users" value={stats.jobSeekers} delay={0.7} />
                    <WriterStat label="Recruiters" value={stats.recruiters} delay={0.8} />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="flex-1 w-full relative pt-12 lg:pt-0"
            >
                <div className="sticky top-24 bg-[#F5F5F0] p-8 md:p-12 border border-black/5 shadow-2xl transition-transform hover:shadow-3xl duration-500">
                    {/* Preview Link Section */}
                    <div className="space-y-3 mb-8">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">Preview Link</span>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="px-4 py-2 border-2 border-blue-500 text-blue-600 font-mono text-sm font-bold rounded">
                                    switchcv.com/resumes/1
                                </span>
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Live</span>
                            </div>
                        </div>
                    </div>

                    {/* Snapshot Section */}
                    <div className="bg-white rounded-xl p-6 border border-black/5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 block mb-4">Snapshot</span>

                        <h2 className="text-3xl font-bold tracking-tight text-black mb-4">
                            Anil <span className="text-gray-400">·</span> Senior Engineer
                        </h2>

                        <p className="text-gray-600 leading-relaxed mb-6">
                            Senior LLM Engineer architecting scalable AI solutions. Proven track record in scaling design systems across multiple platforms.
                        </p>

                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">Skills</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                                    <li>System Architecture</li>
                                    <li>Large Language Models</li>
                                    <li>React / Next.js</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-400">Impact</h3>
                                <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                                    <li>300% User Growth</li>
                                    <li>Reduced Latency by 40ms</li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400">
                                        AI
                                    </div>
                                ))}
                            </div>
                            <span className="text-xs font-mono uppercase text-blue-700 bg-blue-100 px-3 py-1.5 font-bold">Score: 98/100</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}

function WriterStat({ label, value, delay }: { label: string; value: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="space-y-2"
        >
            <p className="text-3xl font-serif font-bold text-black border-l-4 border-blue-600 pl-4">
                {value}
            </p>
            <p className="text-xs font-sans font-medium text-gray-500 uppercase tracking-widest pl-5">
                {label}
            </p>
        </motion.div>
    );
}
