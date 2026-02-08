"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { FloatingGeometrics } from "./role-selection/FloatingGeometrics";
import { RoleCard3D } from "./role-selection/RoleCard3D";
import { CenterOrb } from "./role-selection/CenterOrb";

interface RoleSelectionProps {
    onSelect: (role: "recruiter" | "jobseeker") => void;
}

export function RoleSelection({ onSelect }: RoleSelectionProps) {
    const groupRef = useRef<THREE.Group>(null);

    // Animate the whole scene
    useFrame((state) => {
        if (groupRef.current) {
            // Very subtle scene breathing
            groupRef.current.rotation.y =
                Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Floating geometric background elements */}
            <FloatingGeometrics />

            {/* Particle field */}
            <Sparkles
                count={200}
                scale={30}
                size={2}
                speed={0.3}
                opacity={0.4}
                color="#3B82F6"
            />
            <Sparkles
                count={100}
                scale={25}
                size={3}
                speed={0.5}
                opacity={0.3}
                color="#8B5CF6"
            />

            {/* Title - using Html for better text rendering */}
            <Html center position={[0, 6, 0]}>
                <div className="text-center select-none pointer-events-none">
                    <h1 className="text-6xl font-serif font-bold text-white mb-4 tracking-tight animate-pulse">
                        Choose Your Path
                    </h1>
                    <p className="text-xl text-gray-400">Experience the future of hiring</p>
                </div>
            </Html>

            {/* Animated Role Cards */}
            <RoleCard3D
                position={[-5, -0.5, 0]}
                role="jobseeker"
                title="I'm a Jobseeker"
                subtitle="Find your dream role"
                color="#8B5CF6"
                onSelect={onSelect}
                orbitDirection={1}
            />

            <RoleCard3D
                position={[5, -0.5, 0]}
                role="recruiter"
                title="I'm a Recruiter"
                subtitle="Discover top talent"
                color="#3B82F6"
                onSelect={onSelect}
                orbitDirection={-1}
            />

            {/* Center energy orb */}
            <CenterOrb />
        </group>
    );
}
