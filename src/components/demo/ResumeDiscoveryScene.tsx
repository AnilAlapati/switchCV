"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback } from "react";
import {
    EffectComposer,
    Bloom,
    DepthOfField,
    Vignette,
} from "@react-three/postprocessing";
import { Stars } from "@react-three/drei";

import { RoleSelection } from "./RoleSelection";
import { ResumeFlood } from "./ResumeFlood";
import { SearchBox3D } from "./SearchBox3D";
import { HeroReveal } from "./HeroReveal";
import { useAnimationSequence, Stage } from "@/hooks/useAnimationSequence";

export default function ResumeDiscoveryScene() {
    const { stage, nextStage, resetToStart, selectedRole, setSelectedRole } =
        useAnimationSequence();

    const handleRoleSelect = useCallback(
        (role: "recruiter" | "jobseeker") => {
            setSelectedRole(role);
            nextStage();
        },
        [setSelectedRole, nextStage]
    );

    return (
        <div className="w-full h-full relative">
            {/* 3D Canvas */}
            <Canvas
                camera={{ position: [0, 0, 15], fov: 60 }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true }}
            >
                <color attach="background" args={["#050505"]} />

                <Suspense fallback={null}>
                    {/* Ambient lighting */}
                    <ambientLight intensity={0.2} />
                    <pointLight position={[10, 10, 10]} intensity={0.5} color="#ffffff" />
                    <spotLight
                        position={[0, 20, 0]}
                        angle={0.3}
                        penumbra={1}
                        intensity={0.5}
                        color="#3B82F6"
                    />

                    {/* Background stars */}
                    <Stars
                        radius={100}
                        depth={50}
                        count={2000}
                        factor={4}
                        saturation={0}
                        fade
                        speed={0.5}
                    />

                    {/* Stage-specific content */}
                    {stage === "choice" && (
                        <RoleSelection onSelect={handleRoleSelect} />
                    )}

                    {(stage === "flood" || stage === "search" || stage === "discovery") && (
                        <ResumeFlood
                            stage={stage}
                            role={selectedRole}
                            onFloodComplete={nextStage}
                        />
                    )}

                    {(stage === "search" || stage === "discovery") && (
                        <SearchBox3D
                            stage={stage}
                            role={selectedRole}
                            onSearchComplete={nextStage}
                        />
                    )}

                    {(stage === "discovery" || stage === "reveal") && (
                        <HeroReveal
                            stage={stage}
                            role={selectedRole}
                            onRevealComplete={nextStage}
                        />
                    )}

                    {/* Post-processing effects */}
                    <EffectComposer>
                        <Bloom
                            luminanceThreshold={0.2}
                            luminanceSmoothing={0.9}
                            intensity={0.5}
                        />
                        <DepthOfField
                            focusDistance={0.01}
                            focalLength={0.02}
                            bokehScale={stage === "discovery" ? 8 : 2}
                        />
                        <Vignette eskil={false} offset={0.1} darkness={0.8} />
                    </EffectComposer>
                </Suspense>
            </Canvas>

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Logo */}
                <div className="absolute top-6 left-6 pointer-events-auto">
                    <h1 className="text-white font-serif text-2xl font-bold tracking-tight">
                        Switch<span className="text-blue-500">CV</span>
                    </h1>
                </div>

                {/* Stage indicator */}
                <div className="absolute top-6 right-6">
                    <StageIndicator stage={stage} />
                </div>

                {/* Reveal stage CTA */}
                {stage === "reveal" && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto">
                        <div className="flex gap-4">
                            <button
                                onClick={resetToStart}
                                className="px-6 py-3 bg-white/10 backdrop-blur border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
                            >
                                ↻ Try Again
                            </button>
                            <button className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/30">
                                Go to App →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StageIndicator({ stage }: { stage: Stage }) {
    const stages: Stage[] = ["choice", "flood", "search", "discovery", "reveal"];
    const currentIndex = stages.indexOf(stage);

    return (
        <div className="flex gap-2">
            {stages.map((s, i) => (
                <div
                    key={s}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i <= currentIndex ? "bg-blue-500" : "bg-white/20"
                        } ${i === currentIndex ? "w-6" : ""}`}
                />
            ))}
        </div>
    );
}
