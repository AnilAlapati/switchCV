"use client";

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConceptRegistry, ConceptSlug } from '@/components/vibe-concepts/ConceptRegistry';
import { motion } from "motion/react";

export default function ConceptViewPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);

    const conceptData = ConceptRegistry[slug as ConceptSlug];

    if (!conceptData) {
        notFound();
    }

    const ConceptComponent = conceptData.component;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gray-900">
            {/* Back Button */}
            <Link href="/vibe-concepts/gallery" className="absolute top-8 left-8 z-50 group">
                <motion.div
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white/80 hover:bg-white/20 transition-colors"
                    whileHover={{ x: -4 }}
                >
                    <span>←</span>
                    <span className="text-sm font-medium">Back to Gallery</span>
                </motion.div>
            </Link>

            {/* Render Concept in Fullscreen Mode */}
            <ConceptComponent mode="fullscreen" />
        </div>
    );
}
