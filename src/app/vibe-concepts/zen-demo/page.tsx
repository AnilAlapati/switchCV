"use client";

import { motion } from "framer-motion";

export default function ZenDemo() {
  return (
    <div className="min-h-screen bg-[#F0F4EF] flex items-center justify-center overflow-hidden relative font-sans text-[#2C3E30]">
      {/* Ambient Background Noise/Texture */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
      ></div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center p-8 space-y-12">
        {/* The Breath of Growth: Central Element */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Ripples */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute border border-[#A3BFB0] rounded-full"
              initial={{ width: "100%", height: "100%", opacity: 0.8 }}
              animate={{
                width: ["100%", "150%", "200%"],
                height: ["100%", "150%", "200%"],
                opacity: [0.8, 0.4, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 1.5,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Core Stone / Sprout */}
          <motion.div
            className="w-48 h-48 bg-gradient-to-br from-[#E8F0E9] to-[#D1DDD3] rounded-[40px] shadow-2xl flex items-center justify-center backdrop-blur-sm border border-white/50"
            animate={{
              y: [0, -10, 0],
              rotate: [0, 2, -1, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              className="text-6xl"
            >
              🌱
            </motion.div>
          </motion.div>
        </div>

        {/* Typography: Fade Up */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <h1 className="text-5xl font-serif text-[#1F2F24] tracking-tight">
            Grow Your Future
          </h1>
          <p className="text-lg text-[#5A6F62] max-w-md mx-auto leading-relaxed">
            SwitchCV helps you cultivate a career with intention, balance, and
            precision.
          </p>
        </motion.div>

        {/* Call to Action: Gentle Pulse */}
        <motion.button
          className="px-8 py-4 bg-[#2C3E30] text-[#F0F4EF] rounded-full text-lg font-medium shadow-lg"
          whileHover={{ scale: 1.05, backgroundColor: "#3D5242" }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              "0 10px 15px -3px rgba(44, 62, 48, 0.3)",
              "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Start Your Journey
        </motion.button>
      </div>

      {/* Floating Particles/Leaves */}
      <LeafParticle delay={0} x="10%" />
      <LeafParticle delay={2} x="80%" />
      <LeafParticle delay={4} x="30%" />
      <LeafParticle delay={6} x="70%" />
    </div>
  );
}

function LeafParticle({ delay, x }: { delay: number; x: string }) {
  return (
    <motion.div
      className="absolute top-0 text-2xl text-[#8FBC8F] opacity-60 pointer-events-none"
      style={{ left: x }}
      initial={{ y: -100, opacity: 0, rotate: 0 }}
      animate={{
        y: ["0vh", "100vh"],
        opacity: [0, 1, 0],
        rotate: [0, 360],
        x: [0, 50, -50, 0],
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        delay: delay,
        ease: "linear",
      }}
    >
      🍃
    </motion.div>
  );
}
