"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { ConceptFrame } from "./ConceptFrame";

export const Concept6BonsaiEvolution = ({
  mode,
}: {
  mode?: "card" | "fullscreen";
}) => {
  return (
    <ConceptFrame
      title="Bonsai Evolution"
      description="Sculpting success. A 3D miniature bonsai with leaves that change color and density."
      gradient="bg-gradient-to-tr from-[#E6E6FA] to-[#F0FFF0]"
      mode={mode}
    >
      <div className="relative flex items-end justify-center h-64">
        {/* Pot */}
        <div className="w-32 h-16 bg-white/40 border border-white/60 rounded-b-[40px] shadow-lg backdrop-blur-sm relative z-10" />

        {/* Trunk */}
        <motion.div
          className="absolute bottom-16 w-4 h-24 bg-[#5D4037] origin-bottom rounded-full"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          {/* Branches */}
          <motion.div
            className="absolute top-0 right-0 w-16 h-2 bg-[#5D4037] origin-left -rotate-45"
            animate={{ scaleX: [0, 1] }}
            transition={{ delay: 1, duration: 1 }}
          />
          <motion.div
            className="absolute top-4 left-0 w-12 h-2 bg-[#5D4037] origin-right rotate-45"
            animate={{ scaleX: [0, 1] }}
            transition={{ delay: 1.5, duration: 1 }}
          />
        </motion.div>

        {/* Leaves */}
        <motion.div
          className="absolute bottom-32 w-12 h-12 bg-green-400 rounded-full blur-md opacity-80"
          animate={{
            scale: [0, 1.5],
            backgroundColor: ["#4ADE80", "#FFD700", "#4ADE80"],
          }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
          style={{ left: "45%" }}
        />
        <motion.div
          className="absolute bottom-36 w-10 h-10 bg-teal-400 rounded-full blur-md opacity-80"
          animate={{ scale: [0, 1.4] }}
          transition={{
            duration: 3,
            delay: 0.5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{ left: "55%" }}
        />

        <motion.div
          className="absolute bottom-28 w-8 h-8 bg-emerald-500 rounded-full blur-md opacity-80"
          animate={{ scale: [0, 1.3] }}
          transition={{
            duration: 3.5,
            delay: 1,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          style={{ left: "35%" }}
        />
      </div>
    </ConceptFrame>
  );
};

export const Concept7SumieMotion = ({
  mode,
}: {
  mode?: "card" | "fullscreen";
}) => {
  const particleAnimations = useRef<{ x: number; y: number }[]>(
    /* eslint-disable react-hooks/purity */
    [1, 2, 3].map(() => ({
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
    }))
    /* eslint-enable react-hooks/purity */
  );

  return (
    <ConceptFrame
      title="Sumi-e Motion"
      description="Career artistry. 3D liquid ink strokes floating in space on rice paper."
      gradient="bg-[#F5F5DC]"
      mode={mode}
    >
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        {/* Paper Texture Overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-50 pointer-events-none" />

        {/* Ink Stroke Path */}
        <svg width="400" height="200" viewBox="0 0 400 200">
          <motion.path
            d="M 50 150 Q 150 50 250 150 T 350 50"
            fill="transparent"
            stroke="black"
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
            style={{ filter: "url(#ink-blur)" }}
          />
          <defs>
            <filter id="ink-blur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </filter>
          </defs>
        </svg>

        {/* Splash Particles */}
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-black rounded-full"
            initial={{ opacity: 1, scale: 0 }}
            animate={{
              opacity: 0,
              scale: 2,
              x: particleAnimations.current[i - 1].x,
              y: particleAnimations.current[i - 1].y,
            }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
      </div>
    </ConceptFrame>
  );
};

export const Concept8FloatingKokedama = ({
  mode,
}: {
  mode?: "card" | "fullscreen";
}) => {
  return (
    <ConceptFrame
      title="Floating Kokedama"
      description="Weightless balance. Rotating moss balls with light rings."
      gradient="bg-gradient-to-br from-[#1c1c1c] to-[#2d2d2d]"
      mode={mode}
    >
      <div className="flex justify-center items-center space-x-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative w-24 h-24">
            {/* Light Ring */}
            <motion.div
              className="absolute inset-0 -m-2 border border-white/30 rounded-full"
              animate={{ rotateX: 360, rotateY: 360 }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: "linear" }}
              style={{
                borderTopColor: "transparent",
                borderBottomColor: "transparent",
              }}
            />

            {/* Moss Ball */}
            <motion.div
              className="w-full h-full bg-[#556B2F] rounded-full shadow-inner shadow-black relative overflow-hidden flex items-center justify-center"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 3,
                delay: i,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-full h-full opacity-30 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)]" />
            </motion.div>
          </div>
        ))}
      </div>
    </ConceptFrame>
  );
};

export const Concept9ResonanceChimes = ({
  mode,
}: {
  mode?: "card" | "fullscreen";
}) => {
  const chimeAnimations = useRef<
    { height: number; duration: number; delay: number }[]
  >(
    /* eslint-disable react-hooks/purity */
    [1, 2, 3, 4, 5].map(() => ({
      height: 100 + Math.random() * 80,
      duration: 2 + Math.random(),
      delay: Math.random(),
    }))
    /* eslint-enable react-hooks/purity */
  );

  return (
    <ConceptFrame
      title="Resonance Chimes"
      description="The sound of match. Bamboo chimes swaying with insight."
      gradient="bg-gradient-to-b from-[#e0c3fc] to-[#8ec5fc]"
      mode={mode}
    >
      <div className="absolute top-0 w-full flex justify-center space-x-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="w-4 bg-gradient-to-b from-[#C0C0C0] to-[#A9A9A9] rounded-b-full shadow-md origin-top relative"
            style={{ height: `${chimeAnimations.current[i - 1].height}px` }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{
              duration: chimeAnimations.current[i - 1].duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: chimeAnimations.current[i - 1].delay,
            }}
          >
            {/* String */}
            <div className="absolute -top-[200px] left-1/2 w-[1px] h-[200px] bg-gray-400" />

            {/* Insight Glow */}
            <motion.div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-200 rounded-full blur-sm"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, delay: i }}
            />
          </motion.div>
        ))}
      </div>
    </ConceptFrame>
  );
};

export const Concept10EternalStream = ({
  mode,
}: {
  mode?: "card" | "fullscreen";
}) => {
  return (
    <ConceptFrame
      title="Eternal Stream"
      description="Career flow. A stylized river flowing through a Zen landscape."
      gradient="bg-gradient-to-r from-[#ACCBEE] to-[#E7F0FD]"
      mode={mode}
    >
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center perspective-[500px]">
        {/* River Bed */}
        <div
          className="absolute w-[120%] h-[300px] bg-gradient-to-b from-blue-300 to-blue-500 transform rotate-x-60 scale-y-150"
          style={{ transform: "perspective(500px) rotateX(40deg)" }}
        >
          {/* Flowing Water Texture */}
          <motion.div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.5) 50%)",
              backgroundSize: "50px 100%",
            }}
            animate={{ backgroundPosition: ["0px 0", "100px 0"] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />

          {/* Milestones (Pebbles) */}
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute w-12 h-8 bg-white/80 rounded-full shadow-lg backdrop-blur-md flex items-center justify-center text-[8px] font-bold text-blue-900"
              style={{ left: `${20 + i * 25}%` }}
              initial={{ top: "120%" }}
              animate={{ top: "-20%" }}
              transition={{
                duration: 5,
                repeat: Infinity,
                delay: i * 1.5,
                ease: "linear",
              }}
            >
              ROLE {i}
            </motion.div>
          ))}
        </div>
      </div>
    </ConceptFrame>
  );
};
