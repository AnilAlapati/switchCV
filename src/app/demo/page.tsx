"use client";

import React, { useState, useRef, useEffect, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    MeshDistortMaterial,
    Float,
    Environment,
    Stars,
    PerspectiveCamera,
    ContactShadows,
    Lightformer,
    Text,
    useCursor
} from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
type ViewState = "intro" | "selection" | "recruiter_intro" | "recruiter_search" | "recruiter_match" | "talent_view";

// --- 3D Components ---

function Monoliths({ view, onSelect }: { view: ViewState, onSelect: (role: "recruiter" | "talent") => void }) {
    const group = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState<"left" | "right" | null>(null);
    useCursor(!!hovered);

    useFrame((state) => {
        if (!group.current) return;
        const t = state.clock.getElapsedTime();

        // Only visible in intro/selection
        const visible = view === "selection";
        const targetScale = visible ? 1 : 0;
        group.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        if (visible) {
            // Gentle idle float
            group.current.rotation.y = Math.sin(t * 0.2) * 0.1;
        }
    });

    return (
        <group ref={group}>
            {/* Left Monolith (Recruiter) */}
            <Float floatIntensity={1} speed={2}>
                <mesh
                    position={[-4, 0, 0]}
                    rotation={[0, 0.2, 0]}
                    onPointerOver={() => setHovered("left")}
                    onPointerOut={() => setHovered(null)}
                    onClick={() => onSelect("recruiter")}
                >
                    <boxGeometry args={[3, 6, 0.5]} />
                    <MeshDistortMaterial
                        color={hovered === "left" ? "#4f46e5" : "#222"}
                        speed={2}
                        distort={hovered === "left" ? 0.3 : 0}
                        metalness={0.8}
                        roughness={0.2}
                    />
                </mesh>
            </Float>

            {/* Right Monolith (Talent) */}
            <Float floatIntensity={1} speed={2.5}>
                <mesh
                    position={[4, 0, 0]}
                    rotation={[0, -0.2, 0]}
                    onPointerOver={() => setHovered("right")}
                    onPointerOut={() => setHovered(null)}
                    onClick={() => onSelect("talent")}
                >
                    <boxGeometry args={[3, 6, 0.5]} />
                    <MeshDistortMaterial
                        color={hovered === "right" ? "#ec4899" : "#222"}
                        speed={2}
                        distort={hovered === "right" ? 0.3 : 0}
                        metalness={0.8}
                        roughness={0.2}
                    />
                </mesh>
            </Float>
        </group>
    );
}

function ResumeSea({ view }: { view: ViewState }) {
    const count = 1200;
    const meshRef = useRef<THREE.InstancedMesh>(null);

    const particles = useMemo(() => {
        const temp = [];
        // Use a simple seeded random to maintain purity
        let seed = 123;
        const seededRandom = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };

        for (let i = 0; i < count; i++) {
            // Start them HIGH up for the cascade effect
            const x = (seededRandom() - 0.5) * 60;
            const y = 30 + seededRandom() * 40; // Start high
            const z = (seededRandom() - 0.5) * 30;
            const speed = 0.5 + seededRandom();
            const factor = 0.2 + seededRandom();
            temp.push({ x, y, z, originalY: y, speed, factor });
        }
        return temp;
    }, []);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();

        particles.forEach((p, i) => {
            // -- Animation Logic --
            if (view === "recruiter_intro") {
                // THE CASCADE: Falling down
                // Simple physics simulation
                const earthY = (Math.sin(t * p.speed + i) * 10) - 5; // Target chaotic cloud area

                // Lerp fro high start to chaotic middle
                p.y = THREE.MathUtils.lerp(p.y, earthY, 0.03 * p.speed);

                dummy.position.set(p.x, p.y, p.z);
                dummy.rotation.set(t, t, t);
                dummy.scale.setScalar(1);

            } else if (view === "recruiter_search") {
                // THE SWARM: Swirling around
                const angle = t * p.speed * 0.15 + i * 0.01;
                const radius = 12 + Math.sin(t * p.factor) * 6;

                dummy.position.set(
                    Math.cos(angle) * radius,
                    Math.sin(angle * 0.5) * 10,
                    Math.sin(angle) * radius * 0.5
                );
                dummy.scale.setScalar(1);

            } else if (view === "recruiter_match") {
                // THE SUCTION: Converge to 0
                const current = new THREE.Vector3();
                dummy.matrix.decompose(current, new THREE.Quaternion(), new THREE.Vector3());

                current.lerp(new THREE.Vector3(0, 0, 0), 0.1);
                dummy.position.copy(current);

                // Shrink
                const dist = current.length();
                dummy.scale.setScalar(Math.max(0, dist / 15));
            } else {
                // Hide otherwise
                dummy.scale.setScalar(0);
            }

            dummy.updateMatrix();
            meshRef.current?.setMatrixAt(i, dummy.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <planeGeometry args={[1.0, 1.4]} />
            {/* Guarantees visibility */}
            <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.3}
                side={THREE.DoubleSide}
                toneMapped={false}
            />
        </instancedMesh>
    );
}

function HeroCard({ view }: { view: ViewState }) {
    const group = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!group.current) return;
        // Only show in final match state
        if (view === "recruiter_match") {
            const t = state.clock.getElapsedTime();
            group.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
            group.current.rotation.y = Math.sin(t * 0.3) * 0.1;
        } else {
            group.current.scale.setScalar(0);
        }
    });

    return (
        <group ref={group} scale={[0, 0, 0]}>
            {/* Card geometry ... */}
            <mesh>
                <boxGeometry args={[4, 5.5, 0.5]} />
                <MeshDistortMaterial
                    color="#111"
                    speed={2}
                    distort={0.2}
                    metalness={0.9}
                    roughness={0.1}
                />
            </mesh>
            <mesh position={[0, 0, 0.3]}>
                <planeGeometry args={[3.8, 5.3]} />
                <meshBasicMaterial color="#000" />
                <Text position={[0, 1.5, 0.01]} fontSize={0.4} color="white" anchorX="center" anchorY="middle">
                    Sarah Chen
                </Text>
                <Text position={[0, 0.8, 0.01]} fontSize={0.2} color="#888">AI Architect</Text>
                <Text position={[0, -1, 0.01]} fontSize={0.15} color="#444" maxWidth={3} textAlign="center">
                    Specialized in autonomous agents and large scale reasoning models.
                </Text>
            </mesh>
        </group>
    )
}

function Scene({ view, setView }: { view: ViewState, setView: (v: ViewState) => void }) {
    // Camera Drift for cinematic feel
    useFrame(({ camera, clock }) => {
        const t = clock.getElapsedTime();

        // Different camera positions per state
        if (view === "selection") {
            camera.position.lerp(new THREE.Vector3(0, 0, 15), 0.05);
            camera.lookAt(0, 0, 0);
        } else if (view === "recruiter_intro" || view === "recruiter_search") {
            // Dynamic camera during chaos
            camera.position.x = Math.sin(t * 0.2) * 5;
            camera.position.z = 20 + Math.cos(t * 0.2) * 5;
            camera.lookAt(0, 0, 0);
        } else if (view === "recruiter_match") {
            camera.position.lerp(new THREE.Vector3(0, 0, 8), 0.05);
            camera.lookAt(0, 0, 0);
        }
    });

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={50} />

            <ambientLight intensity={1} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#4f46e5" />
            <pointLight position={[-10, -10, 10]} intensity={2} color="#ec4899" />

            <Monoliths view={view} onSelect={(role) => setView(role === "recruiter" ? "recruiter_intro" : "talent_view")} />
            <ResumeSea view={view} />
            <HeroCard view={view} />

            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            <Lightformer intensity={2} position={[0, 5, 5]} scale={5} color="white" />
        </>
    );
}

// --- UI Overlay ---

function UIOverlay({ view, setView }: { view: ViewState, setView: (v: ViewState) => void }) {

    // Auto-progress from Intro -> Selection
    useEffect(() => {
        if (view === "intro") {
            setTimeout(() => setView("selection"), 1000);
        }
        if (view === "recruiter_intro") {
            // Wait for cascade animation then show search
            setTimeout(() => setView("recruiter_search"), 2500);
        }
    }, [view, setView]);

    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12 z-50 text-white font-sans">
            <div className="flex justify-between items-center w-full">
                <div className="text-xl font-bold tracking-tight">SwitchCV</div>
                <div className="text-xs uppercase opacity-40">Concept: Integrated_Narrative</div>
            </div>

            <AnimatePresence mode="wait">
                {/* Split Screen Labels */}
                {view === "selection" && (
                    <motion.div
                        key="selection"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-between px-32 w-full pointer-events-none"
                    >
                        <div
                            onClick={() => setView("recruiter_intro")}
                            className="text-left pointer-events-auto cursor-pointer group"
                        >
                            <h2 className="text-6xl font-light tracking-tighter group-hover:scale-105 transition-transform duration-300">Recruiters</h2>
                            <p className="text-white/40 mt-2 tracking-widest uppercase text-sm group-hover:text-white transition-colors">Find Intelligence</p>
                        </div>
                        <div
                            onClick={() => setView("talent_view")}
                            className="text-right pointer-events-auto cursor-pointer group"
                        >
                            <h2 className="text-6xl font-light tracking-tighter group-hover:scale-105 transition-transform duration-300">Talent</h2>
                            <p className="text-white/40 mt-2 tracking-widest uppercase text-sm group-hover:text-white transition-colors">Broadcast Skill</p>
                        </div>
                    </motion.div>
                )}

                {/* Recruiter Search */}
                {view === "recruiter_search" && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-auto"
                    >
                        <div className="w-full max-w-xl text-center">
                            <h1 className="text-5xl font-light mb-8">Millions of profiles.<br />One match.</h1>
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-50"></div>
                                <button
                                    onClick={() => setView("recruiter_match")}
                                    className="relative w-full bg-white text-black text-xl py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Find AI Architect
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Clarity / Match Result */}
                {view === "recruiter_match" && (
                    <motion.div
                        key="match"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="absolute bottom-12 w-full text-center pointer-events-auto"
                    >
                        <button onClick={() => setView("selection")} className="text-sm text-white/50 hover:text-white uppercase tracking-widest">
                            Reset Simulation
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function DemoPage() {
    const [view, setView] = useState<ViewState>("intro");

    return (
        <div className="w-full h-screen bg-[#050505] overflow-hidden relative selection:bg-indigo-500/50">
            <div className="absolute inset-0 z-0">
                <Canvas shadows gl={{ antialias: true, toneMappingExposure: 1 }}>
                    <Suspense fallback={null}>
                        <Scene view={view} setView={setView} />
                    </Suspense>
                </Canvas>
            </div>
            <UIOverlay view={view} setView={setView} />
            <div className="absolute inset-0 z-20 pointer-events-none opacity-[0.05] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
}
