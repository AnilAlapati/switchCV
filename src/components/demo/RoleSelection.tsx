"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as drei from "@react-three/drei";
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
            <drei.Sparkles
                count={200}
                scale={[20, 10, 10]}
                size={1.5}
                speed={0.4}
                color="#f8fafc"
            />
            <drei.Sparkles
                count={100}
                scale={[20, 20, 20]}
                size={3}
                speed={0.2}
                color="#60a5fa"
            />

            {/* Title - using Html for better text rendering */}
            <drei.Html center position={[0, 6, 0]}>
                <div className="flex flex-col items-center gap-2 select-none">
                    <h2 className="text-4xl md:text-6xl font-serif font-black tracking-tighter text-black uppercase">
                        Select Your Voice
                    </h2>
                </div>
            </drei.Html>

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
