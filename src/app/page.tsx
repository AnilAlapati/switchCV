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
import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const HERO_HIGHLIGHTS = [
  {
    title: "Resume view tracking",
    description:
      "See how many times your agent-built resume has been viewed and track recruiter interest.",
  },
  {
    title: "Privacy-first sharing",
    description:
      "Share secure links and control who can see your contact information.",
  },
  {
    title: "Autonomous Career Agent",
    description:
      "Your agent builds professional resumes through guided reasoning and strategic optimization.",
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
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <BackgroundBlobs />
        <div className="relative z-10 w-8 h-8 border-4 border-[#2C4A3B] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden text-[#1A2F25] selection:bg-[#2C4A3B]/20 selection:text-[#1A2F25]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <BackgroundBlobs />
      </div>

      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 min-h-screen">
        <div className="container mx-auto px-6 py-12 md:py-24 space-y-32">
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
    }))
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
