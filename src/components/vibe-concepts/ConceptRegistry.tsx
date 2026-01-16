"use client";

import { Concept1ZenGarden, Concept2LivingEcosystem, Concept3CelestialBalance, Concept4PrecisionOrigami, Concept5SandMandala } from './ZenBatch1';
import { Concept6BonsaiEvolution, Concept7SumieMotion, Concept8FloatingKokedama, Concept9ResonanceChimes, Concept10EternalStream } from './ZenBatch2';

export const ConceptRegistry = {
    'zen-garden': { component: Concept1ZenGarden, title: 'Original Zen Garden' },
    'living-ecosystem': { component: Concept2LivingEcosystem, title: 'The Living Ecosystem' },
    'celestial-balance': { component: Concept3CelestialBalance, title: 'Celestial Balance' },
    'precision-origami': { component: Concept4PrecisionOrigami, title: 'Precision Origami' },
    'sand-mandala': { component: Concept5SandMandala, title: 'Digital Sand Mandala' },
    'bonsai-evolution': { component: Concept6BonsaiEvolution, title: 'Bonsai Evolution' },
    'sumie-motion': { component: Concept7SumieMotion, title: 'Sumi-e Motion' },
    'floating-kokedama': { component: Concept8FloatingKokedama, title: 'Floating Kokedama' },
    'resonance-chimes': { component: Concept9ResonanceChimes, title: 'Resonance Chimes' },
    'eternal-stream': { component: Concept10EternalStream, title: 'Eternal Stream' },
};

export type ConceptSlug = keyof typeof ConceptRegistry;
