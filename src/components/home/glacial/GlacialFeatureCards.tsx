import { motion } from "framer-motion";

const FEATURE_CARDS = [
    {
        title: "Privacy First",
        description: "Granular control over who accesses your professional data.",
        accent: "from-blue-50 to-white",
        iconPath: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    },
    {
        title: "AI Architect",
        description: "Intelligent agents that structure your experience optimally.",
        accent: "from-cyan-50 to-white",
        iconPath: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    },
    {
        title: "Smart Tracking",
        description: "Real-time analytics on recruiter engagement and views.",
        accent: "from-sky-50 to-white",
        iconPath: "M8.684 13.342A3 3 0 118.684 9m0 4.342l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z",
    },
    {
        title: "Talent Scout",
        description: "Reverse-entry for recruiters to find your specific profile.",
        accent: "from-indigo-50 to-white",
        iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    },
];

export function GlacialFeatureCards() {
    return (
        <section className="space-y-16 py-12 relative z-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center max-w-3xl mx-auto space-y-4"
            >
                <p className="inline-block text-[10px] uppercase tracking-[0.4em] text-cyan-600 font-bold bg-cyan-50 border border-cyan-100 px-3 py-1 rounded-full">
                    Platform Features
                </p>
                <h2 className="text-4xl sm:text-5xl font-light text-slate-800 tracking-tight">
                    Precision engineering for <br className="hidden sm:block" />
                    <span className="font-semibold text-blue-600">your career profile.</span>
                </h2>
                <p className="text-lg text-slate-500 font-light leading-relaxed">
                    Clean, distraction-free, and powerful tools built for the modern professional.
                </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {FEATURE_CARDS.map((card, index) => (
                    <motion.article
                        key={card.title}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1, duration: 0.5 }}
                        whileHover={{ y: -5 }}
                        className={`group rounded-3xl p-8 bg-gradient-to-br ${card.accent} border border-white/60 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 relative overflow-hidden`}
                    >
                        {/* Hover Glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-400/20 transition-colors" />

                        <div className="w-14 h-14 rounded-2xl bg-white border border-blue-50 flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 text-blue-900">
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d={card.iconPath}
                                />
                            </svg>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 mb-3 tracking-tight group-hover:text-blue-700 transition-colors">
                            {card.title}
                        </h3>
                        <p className="text-slate-500 leading-relaxed text-sm">
                            {card.description}
                        </p>
                    </motion.article>
                ))}
            </div>
        </section>
    );
}
