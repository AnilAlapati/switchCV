import Link from "next/link";

interface HeroStats {
  resumes: string;
  users: string;
  completion: string;
}

interface HeroHighlight {
  title: string;
  description: string;
}

interface HomeHeroProps {
  stats: HeroStats;
  highlights: HeroHighlight[];
}

const CREATION_STEPS = [
  {
    title: "Tell us about you",
    description:
      "Import LinkedIn or answer guided prompts tailored for modern roles.",
    accent: "from-cyan-500/20 to-transparent",
  },
  {
    title: "Let AI refine",
    description:
      "Polish each bullet with AI feedback focused on clarity, metrics, and tone.",
    accent: "from-purple-500/20 to-transparent",
  },
  {
    title: "Share securely",
    description:
      "Publish a unique link with privacy rules and know exactly when it is viewed.",
    accent: "from-rose-500/20 to-transparent",
  },
];

export function HomeHero({ stats, highlights }: HomeHeroProps) {
  return (
    <section className="flex flex-col lg:flex-row gap-12 items-center">
      <div className="flex-1 text-left space-y-6">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl shadow-2xl shadow-cyan-500/25">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-white">SwitchCV</p>
            <p className="text-sm text-slate-400">Live resume intelligence</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 shadow-lg shadow-cyan-500/20 text-sm font-medium text-slate-200">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Live metrics sync across every share link
        </div>
        <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold leading-tight bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
          Ship a living resume with real-time engagement signals.
        </h1>
        <p className="text-lg text-slate-300 max-w-2xl">
          Tell your career story with privacy-first controls. SwitchCV turns
          static PDFs into a data-aware experience. Stream share analytics,
          tighten access controls, and let AI keep every bullet recruiter-ready
          the moment someone opens your link.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
            >
              <p className="text-sm font-semibold text-cyan-200">
                {item.title}
              </p>
              <p className="text-sm text-slate-300 mt-1">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            Get Started
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center border border-slate-700 text-slate-200 px-8 py-4 rounded-2xl font-semibold hover:bg-white/5 transition-all duration-200 backdrop-blur-sm"
          >
            Sign In
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6">
          <HomeHeroStat label="Resumes published" value={stats.resumes} />
          <HomeHeroStat label="Active Users" value={stats.users} />
          <HomeHeroStat
            label="Profile completion rate"
            value={stats.completion}
          />
        </div>
      </div>

      <div className="flex-1 w-full">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-[32px] blur-3xl opacity-40"></div>
          <div className="relative backdrop-blur-3xl bg-white/5 rounded-[32px] border border-white/10 p-8 shadow-2xl shadow-black/40 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Active preview link</p>
                <p className="text-lg font-semibold text-white">
                  switchcv.com/resumes/1
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                Live
              </span>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/5 p-6 space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Snapshot
              </p>
              <div className="space-y-3">
                <p className="text-2xl font-semibold text-white">
                  Anil · Senior Software Engineer
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Scaled design systems across three platforms and led
                  multi-disciplinary squads to ship polished end-to-end
                  experiences.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {CREATION_STEPS.map((step) => (
                <div key={step.title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-sm text-cyan-200">
                    ★
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
