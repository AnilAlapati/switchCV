import Link from "next/link";

interface HeroStats {
  resumes: string;
  jobSeekers: string;
  recruiters: string;
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
      "Answer guided prompts or describe your experience in your own words.",
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
    description: "Publish a unique link and track when your resume is viewed.",
    accent: "from-rose-500/20 to-transparent",
  },
];

export function HomeHero({ stats, highlights }: HomeHeroProps) {
  return (
    <section className="flex flex-col lg:flex-row gap-16 items-center">
      <div className="flex-1 text-left space-y-8">
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/40 rounded-xl border border-white/60 backdrop-blur-sm">
            <svg
              className="w-6 h-6 text-slate-900"
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
            <p className="text-base font-bold text-[#1A2F25]">SwitchCV</p>
            <p className="text-sm text-[#2C4A3B]/80">Live resume intelligence</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-sm font-semibold text-blue-700">
          <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
          AI-powered resume creation with view tracking
        </div>

        <h1 className="text-5xl sm:text-6xl xl:text-7xl font-bold leading-[1.1] text-[#1A2F25] tracking-tight">
          Ship a living resume <br className="hidden sm:block" /> with real-time signals.
        </h1>

        <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
          Tell your career story with AI assistance. SwitchCV helps you create
          professional resumes through guided conversations, track who views
          your resume, and control access.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center glass-button px-8 py-4 rounded-xl font-bold transition-transform hover:-translate-y-1 shadow-lg shadow-[#2C4A3B]/20 text-white bg-[#2C4A3B] hover:bg-[#1A2F25]"
          >
            Get Started
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center bg-white/40 border border-white/60 text-[#1A2F25] px-8 py-4 rounded-xl font-bold hover:bg-white/60 transition-colors backdrop-blur-sm"
          >
            Sign In
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-8">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm"
            >
              <p className="text-sm font-bold text-[#1A2F25]">
                {item.title}
              </p>
              <p className="text-sm text-[#1A2F25]/70 mt-1">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
          <HomeHeroStat label="Resumes" value={stats.resumes} />
          <HomeHeroStat label="Job Seekers" value={stats.jobSeekers} />
          <HomeHeroStat label="Recruiters" value={stats.recruiters} />
        </div>
      </div>

      <div className="flex-1 w-full relative">
        <div className="relative bg-white rounded-3xl border border-slate-200 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] space-y-8 transform rotate-1 transition-transform hover:rotate-0 duration-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Preview Link</p>
              <p className="text-base font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-md inline-block">
                switchcv.com/resumes/1
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
              ● Live
            </span>
          </div>

          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Snapshot
            </p>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-[#1A2F25]">
                Anil · Senior Engineer
              </p>
              <p className="text-[#1A2F25]/80 text-base leading-relaxed">
                Scaled design systems across three platforms and led
                multi-disciplinary squads to ship polished end-to-end
                experiences.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {CREATION_STEPS.map((step) => (
              <div key={step.title} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm flex-shrink-0">
                  ★
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A2F25]">
                    {step.title}
                  </p>
                  <p className="text-sm text-[#1A2F25]/70">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative element behind */}
        <div className="absolute top-12 -right-12 w-32 h-32 bg-slate-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

      </div>
    </section>
  );
}

function HomeHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}
