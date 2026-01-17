"use client";

import { useRef, useState, useEffect } from "react";
import { Html, Float, Text, Center, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Stage } from "@/hooks/useAnimationSequence";

interface HeroRevealProps {
    stage: Stage;
    role: "recruiter" | "jobseeker" | null;
    onRevealComplete: () => void;
}

const HERO_CANDIDATE = {
    name: "Sarah Chen",
    title: "Senior LLM Engineer",
    score: 98,
    skills: ["LLM Architecture", "RAG Systems", "Fine-tuning", "Python"],
    experience: "8 years",
    impact: "Scaled AI to 10M+ users",
    location: "San Francisco, CA",
    availability: "Available Now",
};

const HERO_JOB = {
    company: "OpenAI Labs",
    title: "Staff AI Engineer",
    salary: "$220k - $350k",
    location: "Remote / SF",
    skills: ["LLM", "PyTorch", "Distributed Systems"],
    perks: ["Equity", "Unlimited PTO", "Learning Budget"],
};

export function HeroReveal({ stage, role, onRevealComplete }: HeroRevealProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [scale, setScale] = useState(0);
    const [opacity, setOpacity] = useState(0);
    const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

    // Animate in
    useFrame((_, delta) => {
        if (stage === "discovery" || stage === "reveal") {
            setScale((prev) => Math.min(1, prev + delta * 1.5));
            setOpacity((prev) => Math.min(1, prev + delta * 2));
        }

        if (groupRef.current) {
            groupRef.current.scale.setScalar(scale);
            // Gentle rotation
            groupRef.current.rotation.y = Math.sin(Date.now() * 0.0005) * 0.05;
        }
    });

    // Trigger reveal complete
    useEffect(() => {
        if (stage === "discovery" && !hasTriggeredComplete && scale > 0.9) {
            const timer = setTimeout(() => {
                onRevealComplete();
                setHasTriggeredComplete(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [stage, scale, onRevealComplete, hasTriggeredComplete]);

    if (stage !== "discovery" && stage !== "reveal") return null;

    const isRecruiter = role === "recruiter";

    return (
        <group ref={groupRef} position={[0, 0, 5]}>
            {/* Sparkles around hero */}
            <Sparkles
                count={50}
                scale={8}
                size={3}
                speed={0.4}
                opacity={0.6}
                color="#3B82F6"
            />

            {/* Spotlight effect */}
            <spotLight
                position={[0, 5, 5]}
                angle={0.4}
                penumbra={0.5}
                intensity={2}
                color="#ffffff"
                target-position={[0, 0, 0]}
            />

            {/* Hero card - HTML for rich content */}
            <Html center transform style={{ opacity }}>
                <div className="relative">
                    {/* Glow */}
                    <div className="absolute -inset-8 bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-pink-500/30 blur-3xl rounded-full" />

                    {/* Card */}
                    <div className="relative bg-[#FFFFF8] rounded-2xl p-8 w-[420px] shadow-2xl border-2 border-black/5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <span className="text-xs font-mono uppercase tracking-widest text-gray-400 block mb-1">
                                    {isRecruiter ? "Perfect Match Found" : "Your Ideal Role"}
                                </span>
                                <h2 className="text-3xl font-serif font-bold text-black">
                                    {isRecruiter ? HERO_CANDIDATE.name : HERO_JOB.company}
                                </h2>
                                <p className="text-lg text-gray-600 mt-1">
                                    {isRecruiter ? HERO_CANDIDATE.title : HERO_JOB.title}
                                </p>
                            </div>

                            {/* Score badge */}
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white font-bold text-xl">
                                        {isRecruiter ? HERO_CANDIDATE.score : "⭐"}
                                    </span>
                                </div>
                                <span className="text-xs font-mono text-gray-500 mt-1">
                                    {isRecruiter ? "/100" : "Top Pick"}
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent mb-6" />

                        {/* Skills */}
                        <div className="mb-6">
                            <span className="text-xs font-mono uppercase tracking-widest text-gray-400 block mb-3">
                                {isRecruiter ? "Key Skills" : "Requirements Match"}
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {(isRecruiter ? HERO_CANDIDATE.skills : HERO_JOB.skills).map(
                                    (skill, i) => (
                                        <span
                                            key={skill}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200"
                                        >
                                            {skill}
                                        </span>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <InfoItem
                                label={isRecruiter ? "Experience" : "Salary"}
                                value={isRecruiter ? HERO_CANDIDATE.experience : HERO_JOB.salary}
                            />
                            <InfoItem
                                label="Location"
                                value={isRecruiter ? HERO_CANDIDATE.location : HERO_JOB.location}
                            />
                            <InfoItem
                                label={isRecruiter ? "Impact" : "Perks"}
                                value={
                                    isRecruiter
                                        ? HERO_CANDIDATE.impact
                                        : HERO_JOB.perks.join(", ")
                                }
                            />
                            <InfoItem
                                label="Status"
                                value={isRecruiter ? HERO_CANDIDATE.availability : "Hiring Now"}
                                highlight
                            />
                        </div>

                        {/* CTA buttons */}
                        {stage === "reveal" && (
                            <div className="flex gap-3">
                                <button className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-all">
                                    {isRecruiter ? "View Full Profile" : "Apply Now"}
                                </button>
                                <button className="py-3 px-4 border-2 border-black text-black font-bold rounded-lg hover:bg-black hover:text-white transition-all">
                                    {isRecruiter ? "💬" : "🔖"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Decorative elements */}
                    <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-lg shadow-lg">
                        ⭐
                    </div>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                        ✓ {isRecruiter ? "Ready to Interview" : "Perfect Match"}
                    </div>
                </div>
            </Html>
        </group>
    );
}

function InfoItem({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div>
            <span className="text-xs font-mono uppercase tracking-widest text-gray-400 block mb-1">
                {label}
            </span>
            <span
                className={`text-sm font-medium ${highlight ? "text-green-600" : "text-gray-700"
                    }`}
            >
                {value}
            </span>
        </div>
    );
}
