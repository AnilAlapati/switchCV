import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { useTranslations } from "next-intl";

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
    title: "Strategic Consultation",
    description:
      "Describe your experience or goals and let your agent plan the narrative.",
    accent: "from-cyan-500/20 to-transparent",
  },
  {
    title: "Agentic Optimization",
    description:
      "Your agent refines every detail for clarity, metrics, and industry impact.",
    accent: "from-purple-500/20 to-transparent",
  },
  {
    title: "Share securely",
    description: "Publish a unique link and track when your resume is viewed.",
    accent: "from-rose-500/20 to-transparent",
  },
];

export function HomeHero({ stats, highlights }: HomeHeroProps) {
  const t = useTranslations("hero");
  const tCommon = useTranslations("common");
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -50]);
  const rotate = useTransform(scrollY, [0, 500], [1, -2]);

  return (
    <section
      ref={containerRef}
      className="flex flex-col lg:flex-row gap-16 items-center"
    >
      <motion.div className="flex-1 space-y-6">
        {/* Brand tagline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="flex items-center gap-3"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2C4A3B]/10 border border-[#2C4A3B]/20">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <span className="text-sm font-bold text-[#2C4A3B]">SwitchCV</span>
          </span>
          <span className="text-sm text-[#1A2F25]/60 font-medium">
            Autonomous Career Agent
          </span>
        </motion.div>

        <h1 className="text-5xl sm:text-6xl xl:text-7xl font-bold leading-[1.1] text-[#1A2F25] tracking-tight">
          {t("title")}
        </h1>

        <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center justify-center glass-button-glow px-8 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-white bg-[#2C4A3B] hover:bg-[#1A2F25]"
          >
            {t("cta")}
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center justify-center bg-white/40 border border-white/60 text-[#1A2F25] px-8 py-4 rounded-xl font-bold hover:bg-white/60 transition-colors backdrop-blur-sm shadow-sm"
          >
            {tCommon("next")}
          </Link>
        </div>
        {/* ... */}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8">
          {highlights.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-4 rounded-xl bg-white/40 border border-white/60 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
            >
              <p className="text-sm font-bold text-[#1A2F25]">{item.title}</p>
              <p className="text-sm text-[#1A2F25]/70 mt-1">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-6 border-t border-slate-200/50">
          <HomeHeroStat label="Resumes" value={stats.resumes} delay={0.6} />
          <HomeHeroStat
            label="Job Seekers"
            value={stats.jobSeekers}
            delay={0.7}
          />
          <HomeHeroStat
            label="Recruiters"
            value={stats.recruiters}
            delay={0.8}
          />
        </div>
      </motion.div>

      <motion.div style={{ y: y2 }} className="flex-1 w-full relative">
        <motion.div
          style={{ rotate }}
          whileHover={{ rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative bg-white/80 rounded-3xl border border-white/60 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl space-y-8"
        >
          <div className="flex items-center justify-between border-b border-slate-100/50 pb-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1 font-mono">
                Preview Link
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block">
                  switchcv.com/resumes/1
                </p>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              LIVE
            </span>
          </div>

          <div className="p-6 bg-slate-50/50 rounded-2xl border border-white/50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Snapshot
            </p>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-[#1A2F25] tracking-tight">
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
            {CREATION_STEPS.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + idx * 0.1 }}
                className="flex items-start gap-4 group"
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[#2C4A3B] shadow-sm flex-shrink-0 group-hover:bg-[#2C4A3B] group-hover:text-white transition-colors duration-300">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A2F25]">
                    {step.title}
                  </p>
                  <p className="text-sm text-[#1A2F25]/70">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Decorative elements with parallax */}
        <motion.div
          style={{ y: y1 }}
          className="absolute -top-12 -right-12 w-32 h-32 bg-[#4ADE80] rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob"
        />
        <motion.div
          style={{ y: y2 }}
          className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#2DD4BF] rounded-full mix-blend-multiply filter blur-2xl opacity-20 animate-blob animation-delay-2000"
        />
      </motion.div>
    </section>
  );
}

function HomeHeroStat({
  label,
  value,
  delay,
}: {
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-1"
    >
      <p className="text-3xl font-bold text-[#1A2F25] tracking-tighter">
        {value}
      </p>
      <p className="text-[10px] font-bold text-[#2C4A3B]/60 uppercase tracking-widest">
        {label}
      </p>
    </motion.div>
  );
}
