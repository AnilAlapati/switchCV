const FEATURE_CARDS = [
  {
    title: "Privacy Controls",
    description:
      "Share your resume securely and control who can see your contact information.",
    accent: "from-cyan-500 to-blue-500",
    iconPath:
      "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "AI Resume Builder",
    description:
      "Create polished resumes with AI that helps craft impactful bullet points.",
    accent: "from-purple-500 to-pink-500",
    iconPath:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    title: "View Tracking",
    description:
      "Track when recruiters view your resume and manage access with expiring links.",
    accent: "from-pink-500 to-rose-500",
    iconPath:
      "M8.684 13.342A3 3 0 118.684 9m0 4.342l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z",
  },
  {
    title: "AI-Powered Search",
    description:
      "Recruiters can find candidates using natural language AI search.",
    accent: "from-indigo-500 to-cyan-500",
    iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
];

export function HomeFeatureCards() {
  return (
    <section aria-labelledby="features-heading" className="space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <p className="text-sm font-semibold tracking-[0.3em] text-cyan-300 uppercase">
          Why SwitchCV
        </p>
        <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold">
          Everything you need to go from draft to deal-ready resume.
        </h2>
        <p className="text-slate-300">
          Built for modern job searches where privacy, speed, and
          personalization matter more than ever.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {FEATURE_CARDS.map((card) => (
          <article
            key={card.title}
            className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-6 shadow-xl shadow-black/30 hover:bg-white/10 transition-all duration-300"
          >
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${card.accent} flex items-center justify-center mb-4`}
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={card.iconPath}
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              {card.title}
            </h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              {card.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
