"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { HomeFooterCta } from "@/components/home/HomeFooterCta";
import { LandingFooter } from "@/components/home/LandingFooter";
import { useGlobalStats } from "@/hooks/useGlobalStats";
import { WriterHero } from "@/components/home/writer/WriterHero";
import { WriterFeatureCards } from "@/components/home/writer/WriterFeatureCards";
import { WriterHeader } from "@/components/home/writer/WriterHeader";

const HERO_HIGHLIGHTS = [
  {
    title: "Real-time Interest Tracking",
    description:
      "Gain deep insights into recruiter behavior with live view alerts and engagement analytics for every resume you share.",
  },
  {
    title: "Secure Data Governance",
    description:
      "Maintain total control over your contact information. Share resumes via encrypted, trackable links with granular access levels.",
  },
  {
    title: "5-Agent Collaborative Core",
    description:
      "Your personal team of five specialized agents — Research, Planning, Execution, Validation, and Polish — crafting your perfect professional identity.",
  },
  {
    title: "Agent-Led Interview Prep",
    description:
      "Train for your dream role with personalized coaching and real-time feedback from our interview intelligence agents.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { stats } = useGlobalStats();
  // const { scrolled, particles, isMobile } = useHeroBackground();
  // Preventing unused var warning by commenting out usage until needed
  useHeroBackground();

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
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF8]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin mb-4"></div>
          <p className="text-black/60 font-serif italic animate-pulse">
            SwitchCV is preparing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FFFFF8] text-black selection:bg-black selection:text-white">
      {/* Paper texture overlay could go here */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]"></div>

      {/* Writer Header */}
      <WriterHeader />

      <div className="relative z-10 min-h-screen">
        {/* Added pt-24 to account for fixed header */}
        <div className="container mx-auto px-6 pt-24 md:pt-32 pb-12 md:pb-24 space-y-20">
          <WriterHero stats={stats} highlights={HERO_HIGHLIGHTS} />

          <WriterFeatureCards />

          <HomeFooterCta />
        </div>

        {/* Footer */}
        <LandingFooter />
      </div>
    </div>
  );
}

function useHeroBackground() {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices for performance optimization
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reduce particle count on mobile for better performance
  const particleCount = isMobile ? 8 : 20;

  const [particles] = useState<
    Array<{ left: string; top: string; delay: string; duration: string }>
  >(() =>
    [...Array(particleCount)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
    })),
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrolled, particles, isMobile };
}
