"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

const HERO_HIGHLIGHTS = [
  {
    title: "Privacy-first sharing",
    description:
      "Choose exactly what information recruiters can see at every step.",
  },
  {
    title: "AI-powered polish",
    description: "Turn structured inputs into recruiter-ready copy in seconds.",
  },
  {
    title: "Live resume links",
    description:
      "Send a secure URL that updates the instant you make a change.",
  },
];

const HERO_STATS = [
  { value: "12k+", label: "Resumes published" },
  { value: "48 hrs", label: "Average time to offer" },
  { value: "98%", label: "Profile completion rate" },
];

const FEATURE_CARDS = [
  {
    title: "Privacy Controls",
    description:
      "Share tailored views of your resume and hide contact info until you are ready to respond.",
    accent: "from-cyan-500 to-blue-500",
    iconPath:
      "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  },
  {
    title: "AI Resume Polish",
    description:
      "Highlight impact with AI suggestions tuned for product, design, and technical roles.",
    accent: "from-purple-500 to-pink-500",
    iconPath:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  {
    title: "Smart Sharing",
    description:
      "Track who viewed your resume and revoke access with a single click whenever you need.",
    accent: "from-pink-500 to-rose-500",
    iconPath:
      "M8.684 13.342A3 3 0 118.684 9m0 4.342l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z",
  },
  {
    title: "Collaboration Ready",
    description:
      "Invite mentors or career coaches to leave private comments without editing your master copy.",
    accent: "from-indigo-500 to-cyan-500",
    iconPath:
      "M17 8h2a2 2 0 012 2v7a2 2 0 01-2 2h-2M7 8H5a2 2 0 00-2 2v7a2 2 0 002 2h2m5-5h.01M12 8h.01M9 12h.01M15 12h.01M12 16h.01M9 16h.01M15 16h.01",
  },
];

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

const TESTIMONIALS = [
  {
    quote:
      "SwitchCV helped me turn a messy Google Doc into a resume that actually tells my story.",
    author: "Avery K.",
    role: "Sr. Product Designer",
  },
  {
    quote:
      "Sharing a private link with recruiters means I can update details even after I hit send.",
    author: "Jordan P.",
    role: "Staff Engineer",
  },
  {
    quote:
      "The AI critiques feel like a career coach in the loop—concise, actionable, and spot on.",
    author: "Mina L.",
    role: "Growth PM",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [particles] = useState<
    Array<{ left: string; top: string; delay: string; duration: string }>
  >(() =>
    [...Array(20)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
    }))
  );

  const canAccessDashboard =
    !!user &&
    (user.emailVerified ||
      user.providerData.some((provider) => provider.providerId !== "password"));

  useEffect(() => {
    if (!loading && canAccessDashboard) {
      router.push("/dashboard");
    }
  }, [canAccessDashboard, loading, router]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white selection:bg-cyan-500/30">
      <div className="absolute inset-0">
        <div
          className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br ${
            scrolled ? "from-blue-500/5" : "from-blue-500/10"
          } via-purple-500/10 to-cyan-500/10 animate-pulse`}
        ></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl animate-spin duration-[20s]"></div>
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60 animate-ping"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="container mx-auto px-4 py-16 space-y-20">
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
                  <p className="text-sm text-slate-400">
                    Privacy-first resume OS
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 shadow-lg shadow-cyan-500/20 text-sm font-medium text-slate-200">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Now onboarding private beta candidates
              </div>
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold leading-tight bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                Tell your career story with privacy-first controls and AI
                polish.
              </h1>
              <p className="text-lg text-slate-300 max-w-2xl">
                SwitchCV is the modern resume workspace that keeps sensitive
                details secure, helps you articulate impact, and lets you ship
                updates instantly to teams that matter.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {HERO_HIGHLIGHTS.map((item) => (
                  <div
                    key={item.title}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl"
                  >
                    <p className="text-sm font-semibold text-cyan-200">
                      {item.title}
                    </p>
                    <p className="text-sm text-slate-300 mt-1">
                      {item.description}
                    </p>
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
                {HERO_STATS.map((stat) => (
                  <div key={stat.label} className="space-y-1">
                    <p className="text-3xl font-semibold text-white">
                      {stat.value}
                    </p>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-[32px] blur-3xl opacity-40"></div>
                <div className="relative backdrop-blur-3xl bg-white/5 rounded-[32px] border border-white/10 p-8 shadow-2xl shadow-black/40 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-300">
                        Active preview link
                      </p>
                      <p className="text-lg font-semibold text-white">
                        switchcv.com/avery
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
                        Avery Kim · Product Design Lead
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
                          <p className="text-xs text-slate-400">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="features-heading" className="space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <p className="text-sm font-semibold tracking-[0.3em] text-cyan-300 uppercase">
                Why SwitchCV
              </p>
              <h2
                id="features-heading"
                className="text-3xl sm:text-4xl font-bold"
              >
                Everything you need to go from draft to deal-ready resume.
              </h2>
              <p className="text-slate-300">
                Built for modern job searches where privacy, speed, and
                personalization matter more than ever.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {FEATURE_CARDS.map((card) => (
                <div
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
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="workflow-heading" className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
                  Workflow
                </p>
                <h2 id="workflow-heading" className="text-3xl font-bold">
                  Launch a tailored resume in three focused steps.
                </h2>
              </div>
              <p className="text-slate-300 max-w-xl">
                SwitchCV adapts to however you work—start from a blank canvas,
                import an existing resume, or let AI interview you for the
                details.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {CREATION_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className={`rounded-3xl border border-white/10 bg-gradient-to-br ${step.accent} p-6 backdrop-blur-xl`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-slate-300">
                      Step {index + 1}
                    </span>
                    <span className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-white/80">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="voices-heading" className="space-y-8">
            <div className="text-center space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-rose-300">
                Voices from the community
              </p>
              <h2 id="voices-heading" className="text-3xl font-bold">
                Crafted with real candidates in mind.
              </h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {TESTIMONIALS.map((testimonial) => (
                <div
                  key={testimonial.author}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-xl shadow-black/30"
                >
                  <p className="text-slate-200 text-lg leading-relaxed">
                    “{testimonial.quote}”
                  </p>
                  <div className="mt-6">
                    <p className="text-white font-semibold">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-600/20 via-purple-600/20 to-pink-600/20 p-10 text-center backdrop-blur-xl shadow-2xl shadow-black/40">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">
              Ready when you are
            </p>
            <h3 className="text-3xl font-bold mt-3">
              Launch your next opportunity with a resume you control end-to-end.
            </h3>
            <p className="text-slate-200 mt-3 max-w-2xl mx-auto">
              Join thousands of operators, designers, and engineers who keep
              their resume current, polished, and private with SwitchCV.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Link
                href="/auth?mode=signup"
                className="inline-flex items-center justify-center bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200"
              >
                Create my resume
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border border-white/20 text-white/90 hover:bg-white/10 transition"
              >
                Explore the dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
