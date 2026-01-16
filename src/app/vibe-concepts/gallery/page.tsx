"use client";

import { Concept1ZenGarden, Concept2LivingEcosystem, Concept3CelestialBalance, Concept4PrecisionOrigami, Concept5SandMandala } from '@/components/vibe-concepts/ZenBatch1';
import { Concept6BonsaiEvolution, Concept7SumieMotion, Concept8FloatingKokedama, Concept9ResonanceChimes, Concept10EternalStream } from '@/components/vibe-concepts/ZenBatch2';
import Link from 'next/link';

export default function ZenGalleryPage() {
    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] py-20 px-4 md:px-8">

            {/* Header */}
            <div className="max-w-7xl mx-auto mb-16 text-center space-y-4">
                <h1 className="text-5xl md:text-6xl font-serif text-[#2D3748] tracking-tight">The Zen Collection</h1>
                <p className="text-xl text-[#718096] max-w-2xl mx-auto">
                    10 distinct creative templates exploring the concept of "Organic Growth" for SwitchCV.
                    Each card represents a live, code-based animation prototype.
                </p>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                <Link href="/vibe-concepts/view/zen-garden" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept1ZenGarden />
                </Link>
                <Link href="/vibe-concepts/view/living-ecosystem" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept2LivingEcosystem />
                </Link>
                <Link href="/vibe-concepts/view/celestial-balance" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept3CelestialBalance />
                </Link>
                <Link href="/vibe-concepts/view/precision-origami" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept4PrecisionOrigami />
                </Link>
                <Link href="/vibe-concepts/view/sand-mandala" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept5SandMandala />
                </Link>
                <Link href="/vibe-concepts/view/bonsai-evolution" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept6BonsaiEvolution />
                </Link>
                <Link href="/vibe-concepts/view/sumie-motion" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept7SumieMotion />
                </Link>
                <Link href="/vibe-concepts/view/floating-kokedama" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept8FloatingKokedama />
                </Link>
                <Link href="/vibe-concepts/view/resonance-chimes" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept9ResonanceChimes />
                </Link>
                <Link href="/vibe-concepts/view/eternal-stream" className="transform hover:scale-105 transition-transform duration-300">
                    <Concept10EternalStream />
                </Link>
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto mt-20 text-center border-t border-gray-200 pt-10">
                <p className="text-sm text-gray-500 font-mono">
                    Generated with Framer Motion & Interactive CSS
                </p>
            </div>
        </div>
    );
}
