import { motion } from "framer-motion";

const FEATURE_CARDS = [
  {
    title: "Privacy Controls",
    description:
      "Share your resume securely and control who can see your contact information.",
    accent: "from-cyan-500/10 to-blue-500/5",
    iconPath:
      "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "AI Resume Builder",
    description:
      "Create polished resumes with AI that helps craft impactful bullet points.",
    accent: "from-purple-500/10 to-pink-500/5",
    iconPath:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    title: "View Tracking",
    description:
      "Track when recruiters view your resume and manage access with expiring links.",
    accent: "from-pink-500/10 to-rose-500/5",
    iconPath:
      "M8.684 13.342A3 3 0 118.684 9m0 4.342l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z",
  },
  {
    title: "AI-Powered Search",
    description:
      "Recruiters can find candidates using natural language AI search.",
    accent: "from-indigo-500/10 to-cyan-500/5",
    iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
];

export function HomeFeatureCards() {
  return (
    <section aria-labelledby="features-heading" className="space-y-16 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl mx-auto space-y-4"
      >
        <p className="inline-block text-[10px] uppercase tracking-[0.4em] text-blue-700 font-bold bg-blue-100/50 px-3 py-1 rounded-full">
          The Advantage
        </p>
        <h2 id="features-heading" className="text-4xl sm:text-5xl font-bold text-[#1A2F25] tracking-tight">
          Crafting resumes that <br className="hidden sm:block" /> actually get noticed.
        </h2>
        <p className="text-lg text-slate-600 font-medium">
          Built for modern job searches where privacy, speed, and
          personalization matter more than ever.
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
            whileHover={{ y: -8 }}
            className={`group glass-panel-deep rounded-[2rem] p-8 bg-gradient-to-br ${card.accent} transition-all duration-300 relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors" />

            <div
              className={`w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
            >
              <svg
                className="w-7 h-7 text-[#1A2F25]"
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
            <h3 className="text-xl font-bold text-[#1A2F25] mb-4 tracking-tight">
              {card.title}
            </h3>
            <p className="text-slate-600 leading-relaxed text-sm font-medium">
              {card.description}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
