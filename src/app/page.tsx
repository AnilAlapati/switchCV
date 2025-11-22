"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { HomeFeatureCards } from "@/components/home/HomeFeatureCards";
import { HomeFooterCta } from "@/components/home/HomeFooterCta";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeTestimonials } from "@/components/home/HomeTestimonials";
import { HomeWorkflow } from "@/components/home/HomeWorkflow";
import { useGlobalStats } from "@/hooks/useGlobalStats";

const HERO_HIGHLIGHTS = [
  {
    title: "Live engagement analytics",
    description:
      "Understand open rates, time on page, and follow-ups for every secure link.",
  },
  {
    title: "Precision privacy controls",
    description:
      "Gate sections, watermark assets, and expire access by viewer in seconds.",
  },
  {
    title: "AI refresh suggestions",
    description:
      "Get tailored prompts to update bullets the moment performance dips.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { stats } = useGlobalStats();
  const { scrolled, particles } = useHeroBackground();

  const canAccessDashboard =
    !!user &&
    (user.emailVerified ||
      user.providerData.some((provider) => provider.providerId !== "password"));

  useEffect(() => {
    if (!loading && canAccessDashboard) {
      router.push("/dashboard");
    }
  }, [canAccessDashboard, loading, router]);

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
          <HomeHero stats={stats} highlights={HERO_HIGHLIGHTS} />

          <HomeFeatureCards />

          <HomeWorkflow />

          <HomeTestimonials />

          <HomeFooterCta />
        </div>
      </div>
    </div>
  );
}

function useHeroBackground() {
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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrolled, particles };
}
