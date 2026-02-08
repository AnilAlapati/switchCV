"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

export function CenterOrb() {
    const meshRef = useRef<THREE.Mesh>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (meshRef.current) {
            meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
            meshRef.current.rotation.y = t * 0.5;
            meshRef.current.rotation.x = t * 0.3;
        }
        if (lightRef.current) {
            lightRef.current.intensity = 1 + Math.sin(t * 3) * 0.5;
        }
    });

    return (
        <group position={[0, -0.5, -3]}>
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.5, 2]} />
                <MeshDistortMaterial
                    color="#0a0a1a"
                    emissive="#3B82F6"
                    emissiveIntensity={0.5}
                    distort={0.3}
                    speed={2}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <pointLight ref={lightRef} color="#3B82F6" intensity={1} distance={15} />
            <Sparkles
                count={30}
                scale={4}
                size={2}
                speed={0.5}
                opacity={0.6}
                color="#60A5FA"
            />
        </group>
    );
}
