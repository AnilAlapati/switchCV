"use client";

import { motion } from "framer-motion";
import { ConceptFrame } from "./ConceptFrame";

export const Concept1ZenGarden = ({ mode }: { mode?: 'card' | 'fullscreen' }) => {
    return (
        <ConceptFrame
            title="Original Zen Garden"
            description="The core stability of a river stone and the first sprout of a new career."
            gradient="bg-gradient-to-br from-[#E8F0E9] to-[#D1DDD3]"
            mode={mode}
        >
            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Ripples */}
                {[1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute border border-[#A3BFB0] rounded-full"
                        initial={{ width: "100%", height: "100%", opacity: 0.6 }}
                        animate={{
                            width: ["100%", "200%"],
                            height: ["100%", "200%"],
                            opacity: [0.6, 0]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            delay: i * 1,
                            ease: "easeOut"
                        }}
                    />
                ))}
                {/* Stone */}
                <motion.div
                    className="w-32 h-24 bg-[#8A9A90] rounded-[50px] shadow-xl relative z-10 flex items-center justify-center"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                    {/* Sprout */}
                    <motion.div
                        className="text-4xl absolute -top-6"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 1, delay: 0.5, rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
                    >
                        🌱
                    </motion.div>
                </motion.div>
            </div>
        </ConceptFrame>
    );
};

export const Concept2LivingEcosystem = ({ mode }: { mode?: 'card' | 'fullscreen' }) => {
    return (
        <ConceptFrame
            title="The Living Ecosystem"
            description="A flourishing, integrated professional life with data nodes swinging like dewdrops."
            gradient="bg-gradient-to-br from-[#2F4F3D] to-[#1A2C23]"
            mode={mode}
        >
            <div className="relative w-full h-full">
                {/* Sunbeams */}
                <motion.div
                    className="absolute top-0 right-0 w-[200%] h-full bg-gradient-to-l from-yellow-100/10 to-transparent -rotate-45 transform origin-top-right pointer-events-none"
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 5, repeat: Infinity }}
                />

                {/* Hanging Vines */}
                {[1, 2, 3, 4].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute top-0 w-1 bg-[#4A7A5E] rounded-b-full origin-top"
                        style={{ height: `${100 + i * 40}px`, left: `${20 * i}%` }}
                        animate={{ rotate: [-2, 2, -2] }}
                        transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {/* Data Dewdrop */}
                        <motion.div
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#D4F1F4] rounded-full shadow-[0_0_10px_rgba(212,241,244,0.6)]"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i }}
                        />
                    </motion.div>
                ))}
            </div>
        </ConceptFrame>
    );
};

export const Concept3CelestialBalance = ({ mode }: { mode?: 'card' | 'fullscreen' }) => {
    return (
        <ConceptFrame
            title="Celestial Balance"
            description="Global harmony represented by a moon and eclipse ring over a mirrored lake."
            gradient="bg-gradient-to-b from-[#2B3A67] to-[#8FA2B0]"
            mode={mode}
        >
            <div className="flex flex-col items-center justify-center h-full space-y-8">
                <div className="relative">
                    {/* Eclipse Ring */}
                    <motion.div
                        className="absolute inset-0 -m-2 border-2 border-[#FFD700] rounded-full shadow-[0_0_20px_#FFD700]"
                        animate={{ rotateX: [70, 60, 70], rotateY: [10, -10, 10] }}
                        transition={{ duration: 8, repeat: Infinity }}
                        style={{ perspective: 1000 }}
                    />

                    {/* Moon */}
                    <motion.div
                        className="w-32 h-32 bg-gray-200 rounded-full shadow-inner shadow-gray-400 relative overflow-hidden"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="absolute top-4 left-6 w-8 h-8 rounded-full bg-gray-300/50 blur-sm" />
                        <div className="absolute bottom-8 right-10 w-12 h-12 rounded-full bg-gray-300/30 blur-md" />
                    </motion.div>
                </div>

                {/* Lake Reflection */}
                <div className="w-64 h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm transform scale-x-150" />
            </div>
        </ConceptFrame>
    );
};

export const Concept4PrecisionOrigami = ({ mode }: { mode?: 'card' | 'fullscreen' }) => {
    return (
        <ConceptFrame
            title="Precision Origami"
            description="The craftsmanship of a career, unfolding like a high-tech paper crane."
            gradient="bg-gray-100"
            mode={mode}
        >
            <div className="relative">
                {/* Crane Body (Simplified SVG) */}
                <motion.svg width="150" height="150" viewBox="0 0 100 100" className="drop-shadow-xl">
                    {/* Wing Left */}
                    <motion.path
                        d="M50 50 L10 20 L50 40 Z"
                        fill="#FFFFFF"
                        stroke="#CBD5E1"
                        initial={{ rotate: 0 }}
                        animate={{ rotate: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Wing Right */}
                    <motion.path
                        d="M50 50 L90 20 L50 40 Z"
                        fill="#F8FAFC"
                        stroke="#CBD5E1"
                        initial={{ rotate: 0 }}
                        animate={{ rotate: [0, 10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    {/* Body */}
                    <path d="M50 40 L50 90 L70 50 Z" fill="#E2E8F0" />
                </motion.svg>

                {/* Floating "Data Paper" Particles */}
                <motion.div className="absolute top-0 right-0 text-gray-400 text-xs font-mono" animate={{ y: [0, -20], opacity: [1, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    Experience
                </motion.div>
            </div>
        </ConceptFrame>
    );
};

export const Concept5SandMandala = ({ mode }: { mode?: 'card' | 'fullscreen' }) => {
    return (
        <ConceptFrame
            title="Digital Sand Mandala"
            description="Intentional design. An AI stylus drawing geometric career paths in sand."
            gradient="bg-[#D2B48C]"
            mode={mode}
        >
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Sand Base */}
                <div className="absolute w-[300px] h-[300px] rounded-full border border-[#8B4513]/20 flex items-center justify-center">
                    <motion.div
                        className="w-[200px] h-[200px] border border-[#8B4513]/30 rotate-45"
                        animate={{ rotate: [45, 90, 45] }}
                        transition={{ duration: 10, repeat: Infinity }}
                    />
                    <motion.div
                        className="absolute w-[150px] h-[150px] border border-[#8B4513]/40 rounded-full"
                        animate={{ scale: [1, 0.9, 1] }}
                        transition={{ duration: 5, repeat: Infinity }}
                    />
                </div>

                {/* Stylus */}
                <motion.div
                    className="absolute w-1 h-20 bg-teal-400 rounded-full shadow-[0_0_15px_#2DD4BF] origin-bottom"
                    style={{ top: '30%' }}
                    animate={{
                        x: [0, 50, -50, 0],
                        y: [0, 20, -20, 0],
                        rotate: [0, 15, -15, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
            </div>
        </ConceptFrame>
    );
};
