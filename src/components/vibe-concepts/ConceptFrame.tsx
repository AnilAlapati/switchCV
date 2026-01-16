"use client";

import { motion } from "framer-motion";

interface ConceptFrameProps {
    title: string;
    description: string;
    gradient: string;
    children: React.ReactNode;
    mode?: 'card' | 'fullscreen';
}

export const ConceptFrame = ({ title, description, gradient, children, mode = 'card' }: ConceptFrameProps) => {
    const isFullscreen = mode === 'fullscreen';

    return (
        <div
            className={`
                relative overflow-hidden font-sans group
                ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[400px] w-full max-w-2xl mx-auto rounded-2xl shadow-2xl'}
                ${gradient}
            `}
        >
            {/* Ambient Noise for Texture */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none z-0 mix-blend-overlay"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
            ></div>

            <div className={`relative z-10 w-full h-full flex flex-col justify-between ${isFullscreen ? 'p-12' : 'p-8'}`}>
                {/* Header */}
                <div className="flex justify-between items-start pointer-events-none">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-1 rounded-full border border-white/20">
                        <span className="text-white/80 text-xs font-medium tracking-widest uppercase">SwitchCV Zen</span>
                    </div>
                </div>

                {/* Center Canvas */}
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    {children}
                </div>

                {/* Footer Content */}
                <motion.div
                    className={`
                        relative z-20 bg-black/20 backdrop-blur-lg rounded-xl border border-white/10
                        ${isFullscreen ? 'max-w-md p-8 absolute bottom-12 left-12' : 'p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500'}
                    `}
                    initial={{ opacity: 0.8 }}
                    whileHover={{ opacity: 1 }}
                >
                    <h3 className={`font-serif text-white mb-1 ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>{title}</h3>
                    <p className={`text-white/70 leading-relaxed ${isFullscreen ? 'text-lg' : 'text-sm'}`}>{description}</p>
                </motion.div>
            </div>
        </div>
    );
};
