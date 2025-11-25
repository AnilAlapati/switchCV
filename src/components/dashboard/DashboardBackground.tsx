"use client";

import { useState, useEffect } from "react";

interface DashboardBackgroundProps {
  children: React.ReactNode;
}

interface Particle {
  left: string;
  top: string;
  delay: string;
  duration: string;
}

export function DashboardBackground({ children }: DashboardBackgroundProps) {
  const [state, setState] = useState({
    mounted: false,
    particles: [] as Particle[],
    animate: true,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    if (prefersReducedMotion) {
      const reduceMotionTimer = window.setTimeout(() => {
        setState({ mounted: true, particles: [], animate: false });
      }, 0);

      return () => {
        window.clearTimeout(reduceMotionTimer);
      };
    }

    const generatedParticles: Particle[] = [...Array(9)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 4}s`,
    }));

    const timer = setTimeout(() => {
      setState({ mounted: true, particles: generatedParticles, animate: true });
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(139,92,246,0.16),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(15,23,42,0.95))]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent" />
      </div>

      {state.mounted && state.animate && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {state.particles.map((particle: Particle, i: number) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-cyan-300/70"
              style={{
                left: particle.left,
                top: particle.top,
                animation: `float ${particle.duration} ease-in-out ${particle.delay} infinite`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}
