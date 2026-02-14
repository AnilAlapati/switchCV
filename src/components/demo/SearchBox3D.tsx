"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as drei from "@react-three/drei";
import * as THREE from "three";
import { Stage } from "@/hooks/useAnimationSequence";

interface SearchBox3DProps {
    stage: Stage;
    role: "recruiter" | "jobseeker" | null;
    onSearchComplete: () => void;
}

const SEARCH_QUERIES = {
    recruiter: "LLM Engineer",
    jobseeker: "Remote • $180k+ • AI",
};

export function SearchBox3D({ stage, role, onSearchComplete }: SearchBox3DProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [searchText, setSearchText] = useState("");
    const [showCursor, setShowCursor] = useState(true);
    const [opacity, setOpacity] = useState(0);
    const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

    const fullQuery = role ? SEARCH_QUERIES[role] : "";

    // Typewriter effect
    useEffect(() => {
        if (stage !== "search") return;

        let charIndex = 0;
        const typeInterval = setInterval(() => {
            if (charIndex <= fullQuery.length) {
                setSearchText(fullQuery.slice(0, charIndex));
                charIndex++;
            } else {
                clearInterval(typeInterval);
                // Trigger discovery after typing
                if (!hasTriggeredComplete) {
                    setTimeout(() => {
                        onSearchComplete();
                        setHasTriggeredComplete(true);
                    }, 800);
                }
            }
        }, 100);

        return () => clearInterval(typeInterval);
    }, [stage, fullQuery, onSearchComplete, hasTriggeredComplete]);

    // Cursor blink
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setShowCursor((prev) => !prev);
        }, 500);
        return () => clearInterval(blinkInterval);
    }, []);

    // Fade in animation
    useFrame((_, delta) => {
        if (stage === "search" || stage === "discovery") {
            setOpacity((prev) => Math.min(1, prev + delta * 2));
        }
        if (groupRef.current) {
            // Gentle float
            groupRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.1;
        }
    });

    if (stage !== "search" && stage !== "discovery") return null;

    return (
        <group ref={groupRef} position={[0, 0, 4]}>
            {/* Glassmorphism search box using HTML overlay */}
            <drei.Html
                center
                transform
                occlude={false}
                style={{
                    opacity,
                    transition: "opacity 0.5s",
                }}
            >
                <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full" />

                    {/* Search box */}
                    <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-8 py-6 min-w-[400px] shadow-2xl">
                        {/* Label */}
                        <div className="text-white/50 text-xs font-mono uppercase tracking-widest mb-3">
                            {role === "recruiter" ? "Search Candidates" : "Find Your Role"}
                        </div>

                        {/* Input area */}
                        <div className="flex items-center gap-3">
                            <span className="text-blue-400 text-xl">🔍</span>
                            <div className="flex-1">
                                <span className="text-white text-2xl font-serif">
                                    {searchText}
                                </span>
                                <span
                                    className={`inline-block w-0.5 h-7 bg-blue-500 ml-1 ${showCursor ? "opacity-100" : "opacity-0"
                                        } transition-opacity`}
                                />
                            </div>
                        </div>

                        {/* Fake suggestions */}
                        {searchText.length > 3 && (
                            <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                                <div className="text-white/50 text-xs font-mono uppercase tracking-widest mb-2">
                                    AI Suggestions
                                </div>
                                <SuggestionItem text="Senior LLM Engineer" match={true} />
                                <SuggestionItem text="ML Engineer - NLP" match={false} />
                                <SuggestionItem text="AI Research Scientist" match={false} />
                            </div>
                        )}
                    </div>

                    {/* Floating particles */}
                    <div className="absolute -top-2 -right-2 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                    <div className="absolute -bottom-3 -left-3 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                </div>
            </drei.Html>
        </group>
    );
}

function SuggestionItem({ text, match }: { text: string; match: boolean }) {
    return (
        <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${match
                ? "bg-blue-500/20 border border-blue-500/30"
                : "bg-white/5 hover:bg-white/10"
                }`}
        >
            <span className={match ? "text-blue-400" : "text-white/50"}>
                {match ? "⭐" : "→"}
            </span>
            <span className={match ? "text-white font-medium" : "text-white/70"}>
                {text}
            </span>
        </div>
    );
}
