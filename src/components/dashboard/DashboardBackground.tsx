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
  });

  useEffect(() => {
    // Generate particles only after client-side hydration
    const generatedParticles: Particle[] = [...Array(15)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
    }));
    // Use setTimeout to avoid synchronous state update warning in effect
    const timer = setTimeout(() => {
      setState({ mounted: true, particles: generatedParticles });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl animate-spin duration-[20s]"></div>
      </div>

      {/* Floating Particles */}
      {state.mounted && (
        <div className="absolute inset-0 overflow-hidden">
          {state.particles.map((particle: Particle, i: number) => (
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
      )}

      {children}
    </div>
  );
}
